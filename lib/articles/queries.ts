import { prisma } from '@/lib/db';
import type { FaqItem } from '@/lib/products';

export interface ArticleSource {
  title: string;
  url: string;
}

export async function listPublishedArticles(limit = 100) {
  return prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { slug: true, title: true, summary: true, heroImageType: true, heroImageAlt: true, publishedAt: true, updatedAt: true },
  });
}

export async function getPublishedArticle(slug: string) {
  const a = await prisma.article.findFirst({ where: { slug, status: 'published' }, omit: { heroImage: true } });
  if (!a) return null;
  const products = a.relatedProductIds.length ? await prisma.product.findMany({
    where: { id: { in: a.relatedProductIds }, status: 'published' },
    select: { slug: true, title: true, category: { select: { slug: true, name: true } } },
  }) : [];
  return {
    slug: a.slug,
    title: a.title ?? a.topic,
    summary: a.summary ?? '',
    bodyMd: a.bodyMd ?? '',
    faq: (a.faq as unknown as FaqItem[]) ?? [],
    sources: (a.sources as unknown as ArticleSource[]) ?? [],
    hasImage: !!a.heroImageType,
    imageAlt: a.heroImageAlt ?? '',
    publishedAt: a.publishedAt ?? a.createdAt,
    updatedAt: a.updatedAt,
    products,
  };
}
export type PublishedArticle = NonNullable<Awaited<ReturnType<typeof getPublishedArticle>>>;
