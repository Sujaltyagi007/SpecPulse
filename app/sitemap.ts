import type { MetadataRoute } from 'next';
import { SITE_URL, productPath } from '@/lib/site';
import { listPublishedProducts } from '@/lib/products';
import { listPublishedComparisons, listPublishedRoundups } from '@/lib/pages';
import { listPublishedArticles } from '@/lib/articles/queries';
import { listCategories } from '@/lib/catalog';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, comparisons, roundups, articles, categories] = await Promise.all([
    listPublishedProducts(),
    listPublishedComparisons(),
    listPublishedRoundups(),
    listPublishedArticles(1000),
    listCategories(),
  ]);
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/articles`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${SITE_URL}/compare`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${SITE_URL}/best`, changeFrequency: 'daily' as const, priority: 0.8 },
    ...categories
      .filter((c) => c.productCount > 0)
      .map((c) => ({ url: `${SITE_URL}/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.9 })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/articles/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...roundups.map((r) => ({
      url: `${SITE_URL}/best/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    ...products.map((p) => ({
      url: SITE_URL + productPath(p.categorySlug, p.slug),
      lastModified: p.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...comparisons.map((c) => ({
      url: `${SITE_URL}/compare/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
