import { prisma } from '@/lib/db';
import { listPublishedProducts } from '@/lib/products';

export type ProductListItem = Awaited<ReturnType<typeof listPublishedProducts>>[number];

export const SORTS = {
  popular: 'Featured',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  newest: 'Newest',
  name: 'Name A–Z',
} as const;
export type SortKey = keyof typeof SORTS;

export function sortProducts(products: ProductListItem[], sort: SortKey): ProductListItem[] {
  const priced = (p: ProductListItem) => p.bestPrice?.cents ?? null;
  const byPrice = (dir: 1 | -1) => (a: ProductListItem, b: ProductListItem) => {
    const x = priced(a);
    const y = priced(b);
    if (x == null) return y == null ? 0 : 1;
    if (y == null) return -1;
    return (x - y) * dir;
  };
  const list = [...products];
  switch (sort) {
    case 'price-asc': return list.sort(byPrice(1));
    case 'price-desc': return list.sort(byPrice(-1));
    case 'newest': return list.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    case 'name': return list.sort((a, b) => a.title.localeCompare(b.title));
    default: return list;
  }
}

export async function listCategories() {
  const rows = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { slug: true, name: true, _count: { select: { products: { where: { status: 'published' } } } } },
  });
  return rows.map((c) => ({ slug: c.slug, name: c.name, productCount: c._count.products }));
}
export type CategoryItem = Awaited<ReturnType<typeof listCategories>>[number];

export async function getCategory(slug: string) {
  return prisma.category.findUnique({ where: { slug }, select: { slug: true, name: true } });
}

export async function getSiteStats() {
  const [products, retailers, guides] = await Promise.all([
    prisma.product.count({ where: { status: 'published' } }),
    prisma.retailer.count({ where: { offers: { some: { product: { status: 'published' } } } } }),
    prisma.article.count({ where: { status: 'published' } }),
  ]);
  return { products, retailers, guides };
}

export async function listComparisonCards(opts: { categorySlug?: string; productId?: number; take?: number } = {}) {
  const rows = await prisma.comparison.findMany({
    where: {
      status: 'published',
      ...(opts.categorySlug && { productA: { category: { slug: opts.categorySlug } } }),
      ...(opts.productId && { OR: [{ productAId: opts.productId }, { productBId: opts.productId }] }),
    },
    select: {
      slug: true,
      productA: { select: { title: true, brand: true, imageUrl: true, category: { select: { name: true } } } },
      productB: { select: { title: true, brand: true, imageUrl: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: opts.take,
  });
  return rows.map((c) => ({ slug: c.slug, category: c.productA.category.name, a: c.productA, b: c.productB }));
}
export type ComparisonCardData = Awaited<ReturnType<typeof listComparisonCards>>[number];

export async function listRoundupCards(opts: { categorySlug?: string; productId?: number; take?: number } = {}) {
  const rows = await prisma.roundup.findMany({
    where: {
      status: 'published',
      ...(opts.categorySlug && { category: { slug: opts.categorySlug } }),
      ...(opts.productId && { items: { some: { productId: opts.productId } } }),
    },
    select: {
      slug: true,
      title: true,
      useCase: true,
      updatedAt: true,
      category: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: opts.take,
  });
  return rows.map((r) => ({ slug: r.slug, title: r.title, useCase: r.useCase, category: r.category.name, picks: r._count.items, updatedAt: r.updatedAt }));
}
export type RoundupCardData = Awaited<ReturnType<typeof listRoundupCards>>[number];

export async function getPriceHistory(productId: number, days = 90) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.priceHistory.findMany({
    where: {
      offer: { productId },
      observedAt: { gte: since },
      priceCents: { not: null },
      OR: [{ inStock: null }, { inStock: true }],
    },
    select: { priceCents: true, observedAt: true, offer: { select: { currency: true } } },
    orderBy: { observedAt: 'asc' },
  });
  if (!rows.length) return null;
  const currency = rows[rows.length - 1]!.offer.currency;
  const byDay = new Map<string, number>();
  for (const r of rows) {
    if (r.offer.currency !== currency) continue;
    const day = r.observedAt.toISOString().slice(0, 10);
    const prev = byDay.get(day);
    if (prev == null || r.priceCents! < prev) byDay.set(day, r.priceCents!);
  }
  const points = [...byDay].map(([day, cents]) => ({ day, cents }));
  return points.length >= 2 ? { currency, points } : null;
}

export async function searchSite(raw: string) {
  const q = raw.trim().slice(0, 100);
  if (q.length < 2) return null;
  const has = { contains: q, mode: 'insensitive' as const };
  const [productSlugs, articles, comparisons, roundups, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'published', OR: [{ title: has }, { brand: has }, { model: has }, { category: { name: has } }] },
      select: { slug: true },
      take: 24,
    }),
    prisma.article.findMany({
      where: { status: 'published', OR: [{ title: has }, { summary: has }] },
      select: { slug: true, title: true, summary: true, heroImageType: true, heroImageAlt: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    }),
    prisma.comparison.findMany({
      where: { status: 'published', OR: [{ productA: { title: has } }, { productB: { title: has } }] },
      select: { slug: true },
      take: 12,
    }),
    listRoundupCards().then((all) => all.filter((r) => `${r.title} ${r.category} ${r.useCase ?? ''}`.toLowerCase().includes(q.toLowerCase()))),
    prisma.category.findMany({ where: { name: has }, select: { slug: true, name: true } }),
  ]);
  const wanted = new Set(productSlugs.map((p) => p.slug));
  const cmpSlugs = new Set(comparisons.map((c) => c.slug));
  const [products, cmpCards] = await Promise.all([
    wanted.size ? listPublishedProducts().then((all) => all.filter((p) => wanted.has(p.slug))) : [],
    cmpSlugs.size ? listComparisonCards().then((all) => all.filter((c) => cmpSlugs.has(c.slug))) : [],
  ]);
  return { q, products, articles, comparisons: cmpCards, roundups, categories };
}
