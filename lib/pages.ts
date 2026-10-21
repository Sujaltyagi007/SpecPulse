import { prisma } from '@/lib/db';
import { getProductPage, type FaqItem, type ProductPageData } from '@/lib/products';

async function publishedCopy(pageType: 'comparison' | 'roundup', pageKey: string) {
  const c = await prisma.pageContent.findUnique({ where: { pageType_pageKey: { pageType, pageKey } } });
  if (c?.status !== 'published') return { summary: null, bodyMd: null, faq: [] as FaqItem[] };
  return { summary: c.summary, bodyMd: c.bodyMd, faq: c.faq as unknown as FaqItem[] };
}

export async function getComparisonPage(slug: string) {
  const cmp = await prisma.comparison.findFirst({
    where: { slug, status: 'published' },
    include: { productA: { include: { category: true } }, productB: { include: { category: true } } },
  });
  if (!cmp) return null;
  const [a, b, copy] = await Promise.all([
    getProductPage(cmp.productA.category.slug, cmp.productA.slug),
    getProductPage(cmp.productB.category.slug, cmp.productB.slug),
    publishedCopy('comparison', slug),
  ]);
  if (!a || !b) return null;
  return { slug, updatedAt: cmp.updatedAt, a, b, ...copy };
}

export async function getRoundupPage(slug: string) {
  const r = await prisma.roundup.findFirst({
    where: { slug, status: 'published' },
    include: { category: true, items: { orderBy: { rank: 'asc' }, include: { product: { include: { category: true } } } } },
  });
  if (!r) return null;
  const copy = await publishedCopy('roundup', slug);
  const picks: { rank: number; label: string | null; product: ProductPageData }[] = [];
  for (const item of r.items) {
    const product = await getProductPage(item.product.category.slug, item.product.slug);
    if (product) picks.push({ rank: item.rank, label: item.label, product });
  }
  if (picks.length < 2) return null;
  return { slug, title: r.title, useCase: r.useCase, category: r.category, updatedAt: r.updatedAt, picks, ...copy };
}

export type ComparisonPageData = NonNullable<Awaited<ReturnType<typeof getComparisonPage>>>;
export type RoundupPageData = NonNullable<Awaited<ReturnType<typeof getRoundupPage>>>;

export async function listPublishedComparisons() {
  return prisma.comparison.findMany({
    where: { status: 'published' },
    include: { productA: true, productB: true },
    orderBy: { publishedAt: 'desc' },
  });
}

export async function listPublishedRoundups() {
  return prisma.roundup.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' } });
}

export function specRows(a: ProductPageData, b: ProductPageData) {
  const rows = new Map<string, { label: string; unit: string | null; order: number; a?: string; b?: string }>();
  for (const [side, p] of [['a', a], ['b', b]] as const) {
    for (const s of p.specs.filter((x) => x.verified)) {
      const row = rows.get(s.key) ?? { label: s.label, unit: s.unit, order: s.sortOrder };
      row[side] = s.value;
      rows.set(s.key, row);
    }
  }
  return [...rows.values()].sort((x, y) => x.order - y.order);
}
