import OpenAI from 'openai';

export interface CoverImage {
  bytes: Uint8Array<ArrayBuffer>;
  type: string;
  generator: string;
}

export function buildEditorialBannerPrompt(subjectOrPrompt: string, title?: string): string {
  const subject = subjectOrPrompt.trim() || title?.trim() || 'a flagship consumer tech product';
  return `Create a professional, ultra-realistic editorial banner for a tech news article.
  SUBJECT: ${subject}, shown as the hero, centered or on the right third of the frame, rendered with photorealistic detail: accurate proportions, crisp edges, realistic materials (glass, brushed metal, matte plastic), subtle reflections, and fine surface texture.
  SCENE: A premium studio product shot on a dark gradient futuristic environment background with a soft floor reflection. Floating accent elements (abstract light streaks, subtle particles, faint glowing UI fragments) add depth without clutter.
  LIGHTING: Cinematic three-point lighting with a strong rim light in electric blue to separate the product from the background, soft key light, gentle volumetric glow behind the product, high dynamic range.
  COLOR PALETTE: Deep navy, electric blue, and a warm orange accent. High contrast, vibrant but not oversaturated, cohesive color grading.
  COMPOSITION: 16:9 landscape, rule-of-thirds layout. Hero product on one side, clean negative space on the opposite side reserved for headline text. Strong focal point, clear visual hierarchy, shallow depth of field with a sharp subject and softly blurred background.
  STYLE: Looks designed by a senior graphic designer at a top tech publication (like The Verge, Wired, or MKBHD thumbnails). Modern, bold, clean, premium, high-CTR. Commercial advertising quality, 8K detail, sharp focus.
  MOOD: Exciting, innovative, trustworthy, "just launched" energy.
  DO NOT INCLUDE: text, letters, words, typography, logos, watermarks, brand names, distorted or extra buttons/ports/cameras, warped hands, cluttered backgrounds, low resolution, blur, oversaturation, cartoon or illustration look, plastic-looking CGI.`;
}

export async function generateCoverImage(prompt: string, title: string): Promise<CoverImage & { fallbackReason?: string }> {
  const apiKey = process.env.IMAGE_API_KEY;
  if (!apiKey) return { ...svgCover(title), fallbackReason: 'IMAGE_API_KEY not set' };

  const model = process.env.IMAGE_MODEL ?? 'gpt-image-1';
  const started = Date.now();
  try {
    const client = new OpenAI({ apiKey, baseURL: process.env.IMAGE_BASE_URL, maxRetries: 1, timeout: 180_000 });
    const fullPrompt = buildEditorialBannerPrompt(prompt, title);
    const res = await client.images.generate({ model, prompt: fullPrompt, size: '1536x1024', n: 1 });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error('image API returned no image data');
    await logImageCall(model, started, true);
    return { bytes: new Uint8Array(Buffer.from(b64, 'base64')), type: 'image/png', generator: model };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logImageCall(model, started, false, message);
    return { ...svgCover(title), fallbackReason: `image model failed: ${message.slice(0, 200)}` };
  }
}

async function logImageCall(model: string, started: number, ok: boolean, error?: string) {
  try {
    const { prisma } = await import('@/lib/db');
    await prisma.llmCall.create({
      data: { purpose: 'article:image', provider: 'image', model, keyName: 'IMAGE_API_KEY', ok, error: error?.slice(0, 1000) ?? null, latencyMs: Date.now() - started },
    });
  } catch { }
}

const PALETTES = [
  ['#1e3a8a', '#3b82f6'],
  ['#7c2d12', '#f97316'],
  ['#064e3b', '#10b981'],
  ['#4c1d95', '#8b5cf6'],
  ['#831843', '#f43f5e'],
  ['#134e4a', '#14b8a6'],
] as const;

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}

function wrap(text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = out[lines - 1]!.replace(/\s*\S*$/, '') + '…';
  }
  return out;
}

export function svgCover(title: string): CoverImage {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [dark, light] = PALETTES[hash % PALETTES.length]!;
  const lines = wrap(title, 26, 3);
  const startY = 330 - (lines.length - 1) * 42;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
              <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs>
              <rect width="1200" height="630" fill="url(#g)"/>
              <circle cx="1040" cy="110" r="220" fill="#ffffff" opacity="0.08"/><circle cx="1120" cy="560" r="160" fill="#ffffff" opacity="0.06"/>
              <text x="80" y="120" fill="#ffffff" opacity="0.85" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="4">SPECPULSE GUIDE</text>
              ${lines.map((l, i) => `<text x="80" y="${startY + i * 84}" fill="#ffffff" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="68" font-weight="800">${escapeXml(l)}</text>`).join('\n')}
              </svg>`;
  return { bytes: new Uint8Array(Buffer.from(svg, 'utf8')), type: 'image/svg+xml', generator: 'svg-cover' };
}
