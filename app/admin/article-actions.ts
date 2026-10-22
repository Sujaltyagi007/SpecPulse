'use server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { currentUsername } from '@/lib/admin-user';
import { trendingTech } from '@/lib/articles/serp';
import { checkArticle } from '@/lib/articles/check';
import { chooseCover, regenerateCover, runArticleJob } from '@/lib/articles/generate';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type TrendingTopicItem = {
  id: string;
  topic: string;
  query: string;
  volume?: number;
  increase?: number;
  breakdown?: string[];
  badge?: string;
  source: 'google-trends' | 'catalog-curated';
};

function formatTrendToArticleTopic(query: string, breakdown?: string[]): string {
  const clean = query.trim();
  const titleCase = clean.split(' ').map((w) => {
    const lower = w.toLowerCase();
    if (['ai', 'pc', 'tv', 'anc', 'oled', 'gan', 'usb', 'cve', 'ea'].includes(lower)) return lower.toUpperCase();
    if (lower === 'iphone') return 'iPhone';
    if (lower === 'ipad') return 'iPad';
    if (lower === 'php') return 'PHP';
    if (['a', 'an', 'the', 'in', 'on', 'for', 'to', 'of', 'and', 'with', 'vs'].includes(lower)) return lower;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');

  const capitalized = titleCase.charAt(0).toUpperCase() + titleCase.slice(1);

  if (/review/i.test(clean)) return `${capitalized}: Specs, Hands-On Impressions & Buying Advice`;
  if (/vs|comparison/i.test(clean)) return `${capitalized}: Head-to-Head Specs & Real-World Comparison`;
  if (/best/i.test(clean)) return `${capitalized}: Verified Specs & In-Depth Buyer's Guide`;
  if (/what is|how to/i.test(clean)) return `${capitalized}: Everything Tech Users Need to Know`;

  const first = breakdown?.[0];
  if (first) {
    const highlight = first.charAt(0).toUpperCase() + first.slice(1);
    return `${capitalized} Guide: Exploring ${highlight}, Key Specs & Updates`;
  }
  return `${capitalized}: In-Depth Overview, Specifications & Buyer's Guide`;
}

export async function apiGetTrendingTopics(): Promise<Result<{ topics: TrendingTopicItem[] }>> {
  try {
    const rawTrends = await trendingTech(15).catch(() => []);
    const items: TrendingTopicItem[] = [];
    for (const t of rawTrends) {
      const topic = formatTrendToArticleTopic(t.query, t.trend_breakdown);
      const volumeStr = t.search_volume ? `${t.search_volume >= 1000 ? `${Math.round(t.search_volume / 1000)}K+` : t.search_volume} searches` : undefined;
      const increaseStr = t.increase_percentage ? `+${t.increase_percentage}%` : undefined;
      const badge = [volumeStr, increaseStr].filter(Boolean).join(' • ') || 'Trending Search';

      items.push({
        id: `trend-${t.query.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        topic,
        query: t.query,
        volume: t.search_volume,
        increase: t.increase_percentage,
        breakdown: t.trend_breakdown?.slice(0, 4),
        badge,
        source: 'google-trends',
      });
    }

    // 2. Fetch catalog products to generate catalog-aligned trending angles
    const products = await prisma.product.findMany({
      where: { status: { in: ['published', 'approved', 'review'] } },
      select: { title: true, brand: true, category: { select: { name: true } } },
      take: 6,
    });

    const curatedList: { topic: string; query: string; badge: string }[] = [
      {
        topic: 'Smart Rings in 2026: Oura Ring 4 vs RingConn Gen 2 vs Ultrahuman Air Compared',
        query: 'smart ring comparison',
        badge: 'High Buying Intent',
      },
      {
        topic: 'Best Noise-Cancelling Earbuds for Flights & Commuting: Battery Life & ANC Tested',
        query: 'best noise cancelling earbuds',
        badge: 'Top Buying Guide',
      },
      {
        topic: 'Qi2 15W Wireless Charging Explained: What Chargers Are Actually Worth Buying',
        query: 'qi2 wireless charging',
        badge: 'Rising Tech Standard',
      },
      {
        topic: 'Next-Gen Gaming Handhelds: Steam Deck OLED vs ROG Ally X vs Legion Go',
        query: 'handheld gaming pc comparison',
        badge: 'High Search Interest',
      },
      {
        topic: 'OLED vs Mini-LED Monitors: Peak Brightness, Color Accuracy & Burn-In Risk',
        query: 'oled vs mini led monitor',
        badge: 'Spec Breakdown',
      },
      {
        topic: 'GaN Fast Chargers for Travel: 65W vs 100W vs 140W Multi-Port Comparison',
        query: 'best gan charger for laptop',
        badge: 'Buyer Guide',
      },
    ];

    for (const p of products.slice(0, 3)) {
      curatedList.unshift({
        topic: `${p.title} In-Depth Review: Specs, Real-World Performance & Pricing`,
        query: `${p.title} review`,
        badge: `Catalog Pick (${p.category.name})`,
      });
    }

    for (const c of curatedList) {
      if (!items.some((i) => i.query.toLowerCase() === c.query.toLowerCase())) {
        items.push({
          id: `curated-${c.query.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          topic: c.topic,
          query: c.query,
          badge: c.badge,
          source: 'catalog-curated',
        });
      }
    }

    return { ok: true, topics: items };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function revalidateArticle(slug: string) {
  revalidatePath('/');
  revalidatePath('/articles');
  revalidatePath(`/articles/${slug}`);
  revalidatePath('/sitemap.xml');
}

export async function apiStartArticle(topic: string): Promise<Result<{ id: number }>> {
  try {
    const clean = topic.trim().slice(0, 300);
    const a = await prisma.article.create({
      data: {
        topic: clean,
        slug: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        status: 'generating',
        progress: clean ? 'research' : 'topic',
        createdBy: await currentUsername(),
      },
    });
    after(() => runArticleJob(a.id));
    return { ok: true, id: a.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getArticlesData() {
  const rows = await prisma.article.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      slug: true,
      topic: true,
      title: true,
      summary: true,
      status: true,
      progress: true,
      error: true,
      validationErrors: true,
      warnings: true,
      generator: true,
      publishedAt: true,
      updatedAt: true,
      heroImageType: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    validationErrors: (r.validationErrors as string[]) ?? [],
    warnings: (r.warnings as string[]) ?? [],
    hasImage: !!r.heroImageType,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
export type ArticleListItem = Awaited<ReturnType<typeof getArticlesData>>[number];

/** Re-runs the whole pipeline (research, writing, image) for the same topic. */
export async function apiRegenerateArticle(id: number): Promise<Result> {
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) return { ok: false, error: 'Article not found' };
  if (a.status === 'published') return { ok: false, error: 'Unpublish the article before rewriting it' };
  await prisma.article.update({ where: { id }, data: { status: 'generating', progress: 'research', error: null } });
  after(() => runArticleJob(id));
  revalidatePath(`/admin/articles/${id}`);
  return { ok: true };
}

export async function apiNewCover(id: number, customPrompt?: string): Promise<Result<{ warnings: string[] }>> {
  try {
    const warnings = await regenerateCover(id, customPrompt);
    const a = await prisma.article.findUniqueOrThrow({ where: { id } });
    if (a.status === 'published') revalidateArticle(a.slug);
    return { ok: true, warnings };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiUploadCover(id: number, formData: FormData): Promise<Result> {
  try {
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return { ok: false, error: 'No image file uploaded' };
    }
    const type = file.type;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(type)) {
      return { ok: false, error: 'Unsupported format. Please upload JPG, PNG, WebP or SVG.' };
    }
    if (file.size > 8 * 1024 * 1024) {
      return { ok: false, error: 'File exceeds 8MB limit.' };
    }
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    await prisma.$transaction([
      prisma.articleImage.updateMany({ where: { articleId: id }, data: { chosen: false } }),
      prisma.articleImage.create({
        data: {
          articleId: id,
          image: bytes,
          imageType: type,
          score: 10,
          notes: 'Uploaded custom banner',
          chosen: true,
        },
      }),
      prisma.article.update({
        where: { id },
        data: { heroImage: bytes, heroImageType: type },
      }),
    ]);

    const a = await prisma.article.findUniqueOrThrow({ where: { id }, select: { slug: true, status: true } });
    if (a.status === 'published') revalidateArticle(a.slug);
    revalidatePath(`/admin/articles/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function apiChooseCover(id: number, imageId: number): Promise<Result> {
  try {
    await chooseCover(id, imageId);
    const a = await prisma.article.findUniqueOrThrow({ where: { id }, select: { slug: true, status: true } });
    if (a.status === 'published') revalidateArticle(a.slug);
    revalidatePath(`/admin/articles/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const ArticleEdit = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  summary: z.string().trim().min(1, 'Summary is required'),
  bodyMd: z.string().trim().min(1, 'Body is required'),
  faq: z.array(z.object({ question: z.string().trim(), answer: z.string().trim() })),
  heroImageAlt: z.string().trim().max(300),
  imagePrompt: z.string().trim().max(500).optional(),
});

export async function apiSaveArticle(id: number, input: z.input<typeof ArticleEdit>): Promise<Result<{ errors: string[]; warnings: string[] }>> {
  const parsed = ArticleEdit.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid article' };
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) return { ok: false, error: 'Article not found' };

  const sources = (a.sources as { title: string; url: string }[]) ?? [];
  const researched = !((a.warnings as string[]) ?? []).some((w) => w.startsWith('No web research'));
  const { errors, warnings } = checkArticle({ ...parsed.data, sourceCount: sources.length, researched });
  const keptWarnings = ((a.warnings as string[]) ?? []).filter((w) => /^(Cover is|Research used|Humanise pass)/.test(w));
  if (a.status === 'published' && errors.length) {
    return { ok: false, error: `Not saved: the live article would fail its checks (${errors.join('; ')})` };
  }
  await prisma.article.update({
    where: { id },
    data: { ...parsed.data, validationErrors: errors, warnings: [...warnings, ...keptWarnings] },
  });
  if (a.status === 'published') revalidateArticle(a.slug);
  revalidatePath(`/admin/articles/${id}`);
  return { ok: true, errors, warnings: [...warnings, ...keptWarnings] };
}

export async function apiPublishArticle(id: number): Promise<Result<{ slug: string }>> {
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) return { ok: false, error: 'Article not found' };
  if (a.status !== 'review' && a.status !== 'archived') return { ok: false, error: `Can't publish an article that is ${a.status}` };
  const errors = (a.validationErrors as string[]) ?? [];
  if (errors.length) return { ok: false, error: `Fix these first: ${errors.join('; ')}` };
  await prisma.article.update({
    where: { id },
    data: { status: 'published', publishedAt: a.publishedAt ?? new Date(), reviewedBy: await currentUsername() },
  });
  revalidateArticle(a.slug);
  revalidatePath(`/admin/articles/${id}`);
  return { ok: true, slug: a.slug };
}

export async function apiUnpublishArticle(id: number): Promise<Result> {
  const a = await prisma.article.update({ where: { id }, data: { status: 'archived' } });
  revalidateArticle(a.slug);
  revalidatePath(`/admin/articles/${id}`);
  return { ok: true };
}

export async function apiDeleteArticle(id: number): Promise<Result> {
  try {
    const a = await prisma.article.delete({ where: { id } });
    revalidateArticle(a.slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
