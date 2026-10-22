import OpenAI from 'openai';
import sharp from 'sharp';
import { z } from 'zod';
import { generateJson } from '@/lib/llm/pool';
import { getSetting } from '@/lib/settings';
import { DEFAULT_BANNER_DIRECTIONS, DEFAULT_BANNER_TEMPLATE, fillBannerTemplate, type BannerConcept } from '@/lib/articles/banner-defaults';

export interface CoverImage {
  bytes: Uint8Array<ArrayBuffer>;
  type: string;
  generator: string;
}

/** Final banner size: 1200x630 (the OG ratio) at 4/3 density so it stays crisp on retina screens. */
const OUT_W = 1600;
const OUT_H = 840;

interface Palette {
  /** How the palette is described to the image model. */
  name: string;
  /** Near-black base. */
  ink: string;
  /** Lead colour. */
  a: string;
  /** Contrast accent. */
  b: string;
  /** Text colour that reads on `a`. */
  onA: string;
}

const PALETTES: Palette[] = [
  { name: 'electric cobalt blue with a hot coral accent', ink: '#060B1F', a: '#2F6BFF', b: '#FF5A4E', onA: '#FFFFFF' },
  { name: 'ultraviolet purple with a neon magenta accent', ink: '#0C0619', a: '#7C3AED', b: '#FF2E93', onA: '#FFFFFF' },
  { name: 'acid lime green with a deep teal accent', ink: '#04140F', a: '#C6FF3D', b: '#00A88F', onA: '#04140F' },
  { name: 'molten amber with a midnight blue accent', ink: '#070A18', a: '#FFB020', b: '#3B5BFF', onA: '#070A18' },
  { name: 'vivid cyan with a tangerine orange accent', ink: '#03121A', a: '#16D9F5', b: '#FF7A1A', onA: '#03121A' },
  { name: 'signal red with a warm peach accent on graphite', ink: '#0E0B0C', a: '#FF2D3D', b: '#FF9E7A', onA: '#FFFFFF' },
];

/** One candidate per art direction; each is a different idea, not a re-roll, so the ranker (and editor) has a real choice. */
const CONCEPTS: { key: BannerConcept; setting: string }[] = [
  { key: 'hero', setting: 'BANNER_DIRECTION_HERO' },
  { key: 'color', setting: 'BANNER_DIRECTION_COLOR' },
  { key: 'kinetic', setting: 'BANNER_DIRECTION_KINETIC' },
];

function hashOf(s: string): number {
  let hash = 0;
  for (const ch of s) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

/** Each article gets its own palette (stable per title), and each concept a neighbouring one so the options differ. */
function paletteFor(title: string, offset = 0): Palette {
  return PALETTES[(hashOf(title) + offset) % PALETTES.length]!;
}

/** The full prompt for each art direction, built from the (admin-editable) template and directions. */
export async function buildBannerPrompts(
  subjectOrPrompt: string,
  title: string,
  overrides: Partial<Record<string, string>> = {},
): Promise<{ concept: BannerConcept; prompt: string }[]> {
  const subject = subjectOrPrompt.trim() || title.trim() || 'a flagship consumer tech product';
  const read = async (key: string) => overrides[key] ?? (await getSetting(key));
  const template = (await read('BANNER_PROMPT_TEMPLATE')) || DEFAULT_BANNER_TEMPLATE;
  return Promise.all(
    CONCEPTS.map(async ({ key, setting }, i) => ({
      concept: key,
      prompt: fillBannerTemplate(template, {
        title: title.trim(),
        subject,
        direction: (await read(setting)) || DEFAULT_BANNER_DIRECTIONS[key],
        palette: paletteFor(title, i).name,
      }),
    })),
  );
}

/** Sizes in the banner ratio for models that take any size; older GPT image models only do 1536x1024 (cropped later). */
function sizeFor(model: string): string {
  return /^gpt-image-(2|[3-9])/.test(model) || model === 'chatgpt-image-latest' ? '1920x1008' : '1536x1024';
}

/** Crops to the banner ratio (keeping the most interesting region) and re-encodes as a high-quality JPEG. */
async function finishBanner(raw: Buffer): Promise<Uint8Array<ArrayBuffer>> {
  const out = await sharp(raw)
    .resize(OUT_W, OUT_H, { fit: 'cover', position: sharp.strategy.attention, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.5 })
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
  return new Uint8Array(out);
}

export async function generateCoverCandidates(
  prompt: string,
  title: string,
  count = 3,
): Promise<{ images: CoverImage[]; fallbackReason?: string }> {
  const apiKey = await getSetting('IMAGE_API_KEY');
  if (!apiKey) {
    return {
      images: svgCoverCandidates(title, Math.floor(Math.random() * 1000)),
      fallbackReason: 'no OpenAI image key set in Settings → AI & API keys, using typographic banners',
    };
  }

  const model = (await getSetting('IMAGE_MODEL')) || 'gpt-image-2';
  const quality = ((await getSetting('IMAGE_QUALITY')) || 'high') as 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  const client = new OpenAI({ apiKey, baseURL: (await getSetting('IMAGE_BASE_URL')) || undefined, maxRetries: 1, timeout: 240_000 });
  const prompts = await buildBannerPrompts(prompt, title);

  const results = await Promise.allSettled(
    prompts.slice(0, count).map(async (concept) => {
      const started = Date.now();
      try {
        const res = await client.images.generate({
          model,
          prompt: concept.prompt,
          size: sizeFor(model),
          quality,
          n: 1,
          output_format: 'png',
          background: 'opaque',
        });
        const b64 = res.data?.[0]?.b64_json;
        if (!b64) throw new Error('image API returned no image data');
        const bytes = await finishBanner(Buffer.from(b64, 'base64'));
        await logImageCall(model, started, true);
        return { bytes, type: 'image/jpeg', generator: `${model}:${concept.concept}` };
      } catch (err) {
        await logImageCall(model, started, false, err instanceof Error ? err.message : String(err));
        throw err;
      }
    }),
  );

  const images = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  if (images.length) return { images };
  const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  const message = first?.reason instanceof Error ? first.reason.message : String(first?.reason);
  return {
    images: svgCoverCandidates(title, Math.floor(Math.random() * 1000)),
    fallbackReason: `image generation failed (${message.slice(0, 140)}), using typographic banners`,
  };
}

const CoverScores = z.object({
  scores: z.array(z.object({ index: z.number().int(), score: z.number().min(0).max(10), reason: z.string() })),
});

const SCORE_SYSTEM = `You are the art director of a consumer tech publication, choosing the hero banner for an article. You are shown candidate images in order (image 1, image 2, ...).

Score each from 0 to 10 on how good a banner it is:
- Relevance (most important): it clearly shows the kind of product the article is about, matching the brief.
- Artifacts: no visible text, letters, logos or watermarks; no warped geometry, melted parts, extra or impossible buttons, ports or lenses. Any garbled text or obvious AI defect caps the score at 4.
- Stopping power: would it make someone stop scrolling? Bold colour, strong contrast, a subject that reads instantly at small thumbnail size.
- Composition: subject fully in frame on one side, clean negative space for a headline, one clear focal point.
- Craft: looks art-directed and premium (lighting, materials, colour grade); not generic stock, cartoonish or plastic-looking.

Return one entry per image with its 0-based index, score and a one-sentence reason a human editor can act on.`;

/**
 * Scores candidates with a vision model from the LLM pool and returns them best first. If scoring fails (no vision
 * model, bad output), the candidates come back in their original order with null scores and the error as `failure`.
 */
export async function rankCovers(
  images: CoverImage[],
  brief: { title: string; imagePrompt: string },
): Promise<{ ranked: (CoverImage & { score: number | null; notes: string | null })[]; failure?: string }> {
  // Typographic fallbacks are not worth a vision call: keep them in order, unscored.
  if (images.some((img) => img.type === 'image/svg+xml')) {
    return { ranked: images.map((img) => ({ ...img, score: null, notes: `Typographic fallback (${img.generator})` })) };
  }

  const unscored = images.map((img) => ({ ...img, score: null, notes: null }));
  if (images.length < 2) return { ranked: unscored };

  try {
    const { data } = await generateJson({
      purpose: 'article:cover-score',
      system: SCORE_SYSTEM,
      user: `ARTICLE TITLE: ${brief.title}\nIMAGE BRIEF: ${brief.imagePrompt}\n\nScore all ${images.length} images.`,
      schema: CoverScores,
      images: images.map((img) => ({ bytes: img.bytes, type: img.type })),
    });
    const byIndex = new Map(data.scores.map((s) => [s.index, s]));
    const ranked = images.map((img, i) => ({
      ...img,
      score: byIndex.get(i)?.score ?? null,
      notes: byIndex.get(i)?.reason ?? null,
    }));
    return { ranked: ranked.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) };
  } catch (err) {
    return { ranked: unscored, failure: (err instanceof Error ? err.message : String(err)).slice(0, 200) };
  }
}

async function logImageCall(model: string, started: number, ok: boolean, error?: string) {
  try {
    const { prisma } = await import('@/lib/db');
    await prisma.llmCall.create({
      data: {
        purpose: 'article:image',
        provider: 'image',
        model,
        keyName: 'IMAGE_API_KEY',
        ok,
        error: error?.slice(0, 1000) ?? null,
        latencyMs: Date.now() - started,
      },
    });
  } catch {}
}

// ---------------------------------------------------------------------------------------------------------------
// Typographic fallback: used when image generation is unavailable. Pure type and shape, no fake product or data.
// ---------------------------------------------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}

function wrap(text: string, max: number, lines: number): { out: string[]; truncated: boolean } {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  const truncated = out.length > lines;
  if (truncated) {
    out.length = lines;
    out[lines - 1] = out[lines - 1]!.replace(/\s*\S*$/, '') + '…';
  }
  return { out, truncated };
}

/** Largest headline size whose wrapped lines fit the column without truncating (or the smallest, truncated). */
function fitHeadline(title: string, columnWidth: number): { lines: string[]; size: number } {
  const sizes = [76, 66, 58, 50, 44];
  for (const size of sizes) {
    const { out, truncated } = wrap(title, Math.floor(columnWidth / (size * 0.54)), 3);
    if (!truncated) return { lines: out, size };
  }
  const size = sizes.at(-1)!;
  return { lines: wrap(title, Math.floor(columnWidth / (size * 0.54)), 3).out, size };
}

function kickerFor(title: string): string {
  if (/\bvs\.?\b|versus|compared/i.test(title)) return 'Head to head';
  if (/^best\b|\bbest\b/i.test(title)) return 'Best picks';
  if (/^how\b|how to/i.test(title)) return 'How to';
  if (/review/i.test(title)) return 'Review';
  if (/worth it|should you/i.test(title)) return 'Verdict';
  return 'Buying guide';
}

const FONT = `'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

type SvgStyle = 'spotlight' | 'poster' | 'split';

function headlineSvg(lines: string[], size: number, x: number, centerY: number, fill: string, lastFill: string): string {
  const lead = Math.round(size * 1.04);
  const top = Math.round(centerY - ((lines.length - 1) * lead) / 2 + size * 0.35);
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${top + i * lead}" fill="${i === lines.length - 1 ? lastFill : fill}" font-family="${FONT}" font-size="${size}" font-weight="900" letter-spacing="${(-size * 0.03).toFixed(1)}">${escapeXml(line)}</text>`,
    )
    .join('');
}

function kickerSvg(label: string, x: number, y: number, bg: string, fg: string): string {
  const text = label.toUpperCase();
  const w = Math.round(text.length * 10.4 + 40);
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="38" rx="19" fill="${bg}"/><text x="20" y="25" fill="${fg}" font-family="${FONT}" font-size="15" font-weight="800" letter-spacing="2.4">${escapeXml(text)}</text></g>`;
}

function brandSvg(x: number, y: number, mark: string, fg: string): string {
  return `<g transform="translate(${x} ${y})"><path d="M0,10 L10,10 L15,0 L22,20 L28,4 L32,10 L42,10" fill="none" stroke="${mark}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><text x="56" y="17" fill="${fg}" font-family="${FONT}" font-size="20" font-weight="800" letter-spacing="0.5">SpecPulse</text></g>`;
}

const GRAIN = `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0"/></filter>`;

function renderSvg(title: string, style: SvgStyle, p: Palette): string {
  const kicker = kickerFor(title);
  const W = 1200;
  const H = 630;

  if (style === 'poster') {
    // Saturated colour field, oversized concentric rings bleeding off the right edge, dark ink headline.
    const { lines, size } = fitHeadline(title, 720);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${GRAIN}
    <linearGradient id="field" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.a}" stop-opacity="0.82"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${p.ink}"/>
  <rect width="${W}" height="${H}" fill="url(#field)"/>
  <g fill="none" stroke="${p.onA}" stroke-opacity="0.14">
    ${[120, 200, 280, 360, 440].map((r) => `<circle cx="1080" cy="330" r="${r}" stroke-width="${r / 10}"/>`).join('')}
  </g>
  <circle cx="1080" cy="330" r="96" fill="${p.b}"/>
  <circle cx="1080" cy="330" r="96" fill="none" stroke="${p.onA}" stroke-opacity="0.25" stroke-width="2"/>
  ${kickerSvg(kicker, 72, 72, p.onA, p.a)}
  ${headlineSvg(lines, size, 72, 330, p.onA, p.onA)}
  <rect x="72" y="${330 + (lines.length * size * 1.04) / 2 + 26}" width="96" height="8" fill="${p.b}"/>
  ${brandSvg(72, 548, p.onA, p.onA)}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
  }

  if (style === 'split') {
    // Dark headline panel against a bold diagonal colour slab with stacked glass tiles.
    const { lines, size } = fitHeadline(title, 640);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${GRAIN}
    <linearGradient id="slab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.08"/></linearGradient>
    <filter id="drop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="${p.ink}" flood-opacity="0.45"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${p.ink}"/>
  <path d="M760,0 L${W},0 L${W},${H} L600,${H} Z" fill="url(#slab)"/>
  <g filter="url(#drop)">
    <rect x="800" y="150" width="250" height="330" rx="36" fill="${p.ink}" fill-opacity="0.35" transform="rotate(-12 925 315)"/>
    <rect x="840" y="140" width="250" height="330" rx="36" fill="url(#glass)" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="2" transform="rotate(8 965 305)"/>
  </g>
  <circle cx="1010" cy="200" r="34" fill="${p.ink}"/>
  <circle cx="1010" cy="200" r="14" fill="${p.b}"/>
  ${kickerSvg(kicker, 72, 72, p.a, p.onA)}
  ${headlineSvg(lines, size, 72, 320, '#FFFFFF', p.a)}
  ${brandSvg(72, 548, p.a, '#FFFFFF')}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
  }

  // spotlight: near-black stage, big soft colour glows, a luminous ring, white headline with a colour last line.
  const { lines, size } = fitHeadline(title, 700);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${GRAIN}
    <radialGradient id="g1" cx="0.82" cy="0.3" r="0.55"><stop offset="0" stop-color="${p.a}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.a}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0.95" cy="0.95" r="0.5"><stop offset="0" stop-color="${p.b}" stop-opacity="0.6"/><stop offset="1" stop-color="${p.b}" stop-opacity="0"/></radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
    <linearGradient id="hl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${p.ink}"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  <circle cx="985" cy="300" r="190" fill="none" stroke="url(#ring)" stroke-width="30" filter="url(#soft)" opacity="0.9"/>
  <circle cx="985" cy="300" r="190" fill="none" stroke="url(#ring)" stroke-width="10"/>
  <circle cx="985" cy="300" r="120" fill="${p.ink}" fill-opacity="0.55"/>
  ${kickerSvg(kicker, 72, 72, p.a, p.onA)}
  ${headlineSvg(lines, size, 72, 320, '#FFFFFF', 'url(#hl)')}
  ${brandSvg(72, 548, p.a, '#FFFFFF')}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
}

/** A typographic banner, deterministic for a given title (and style/palette offset). */
export function svgCover(title: string, style: SvgStyle = 'spotlight', paletteOffset = 0): CoverImage {
  const svg = renderSvg(title, style, paletteFor(title, paletteOffset));
  return { bytes: new Uint8Array(Buffer.from(svg, 'utf8')), type: 'image/svg+xml', generator: `svg-${style}` };
}

/** Three typographic banners; a different `seed` rotates palettes and layout order so a regenerate looks different. */
export function svgCoverCandidates(title: string, seed = 0): CoverImage[] {
  const styles: SvgStyle[] = ['spotlight', 'poster', 'split'];
  return styles.map((_, i) => svgCover(title, styles[(i + seed) % styles.length]!, i + seed));
}
