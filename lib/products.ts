import { prisma } from '@/lib/db';
import { isLiveOffer } from '@/lib/offers';
import { buildAffiliateUrl } from '@/lib/affiliate';

export interface FaqItem {
  question: string;
  answer: string;
}

export async function listPublishedProducts(opts: { categorySlug?: string; excludeSlug?: string } = {}) {
  const products = await prisma.product.findMany({
    where: {
      status: 'published',
      ...(opts.categorySlug && { category: { slug: opts.categorySlug } }),
      ...(opts.excludeSlug && { slug: { not: opts.excludeSlug } }),
    },
    include: { category: true, offers: true },
    orderBy: [{ category: { name: 'asc' } }, { title: 'asc' }],
  });
  return products.map((p) => {
    const live = p.offers.filter((o) => isLiveOffer(o));
    const best = live.reduce<(typeof live)[number] | null>(
      (min, o) => (min == null || o.priceCents! < min.priceCents! ? o : min),
      null,
    );
    return {
      slug: p.slug,
      title: p.title,
      brand: p.brand,
      imageUrl: p.imageUrl,
      categorySlug: p.category.slug,
      categoryName: p.category.name,
      updatedAt: p.updatedAt,
      publishedAt: p.publishedAt ?? p.updatedAt,
      bestPrice: best ? { cents: best.priceCents!, currency: best.currency } : null,
    };
  });
}

export async function getProductPage(categorySlug: string, slug: string) {
  const p = await prisma.product.findFirst({
    where: { slug, status: 'published', category: { slug: categorySlug } },
    include: {
      category: { include: { specFields: true } },
      specs: true,
      offers: {
        include: { retailer: { include: { affiliateProgram: true } } },
        orderBy: [{ priceCents: { sort: 'asc', nulls: 'last' } }],
      },
    },
  });
  if (!p) return null;

  const content = await prisma.pageContent.findUnique({
    where: { pageType_pageKey: { pageType: 'product', pageKey: slug } },
  });
  const published = content?.status === 'published' ? content : null;

  const fields = new Map(p.category.specFields.map((f) => [f.key, f]));
  const specs = p.specs.map((s) => {
    const f = fields.get(s.key);
    return {
      key: s.key,
      label: f?.label ?? s.key,
      unit: f?.unit ?? null,
      value: s.value,
      verified: s.verifiedAt != null,
      sortOrder: f?.sortOrder ?? 9999,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));

  const offers = p.offers.map((o) => ({
    id: o.id,
    retailer: o.retailer.name,
    priceCents: o.priceCents,
    currency: o.currency,
    inStock: o.inStock,
    lastSeenAt: o.lastSeenAt,
    live: isLiveOffer(o),
    url: buildAffiliateUrl(o, o.retailer.affiliateProgram),
  }));

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    model: p.model,
    gtin: p.gtin,
    mpn: p.mpn,
    imageUrl: p.imageUrl,
    updatedAt: p.updatedAt,
    category: { slug: p.category.slug, name: p.category.name },
    specs,
    offers,
    summary: published?.summary ?? null,
    bodyMd: published?.bodyMd ?? null,
    faq: (published?.faq as FaqItem[] | undefined) ?? [],
  };
}

export type ProductPageData = NonNullable<Awaited<ReturnType<typeof getProductPage>>>;
