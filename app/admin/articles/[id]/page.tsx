import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ArticleEditorClient } from './article-editor-client';

export const dynamic = 'force-dynamic';

export default async function ArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const a = await prisma.article.findUnique({ where: { id }, omit: { heroImage: true } });
  if (!a) notFound();
  const [products, covers] = await Promise.all([
    a.relatedProductIds.length
      ? prisma.product.findMany({ where: { id: { in: a.relatedProductIds } }, select: { id: true, title: true, status: true } })
      : [],
    prisma.articleImage.findMany({
      where: { articleId: id },
      select: { id: true, score: true, notes: true, chosen: true },
      orderBy: [{ score: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    }),
  ]);

  return (
    <ArticleEditorClient
      article={{
        id: a.id,
        slug: a.slug,
        topic: a.topic,
        title: a.title ?? '',
        summary: a.summary ?? '',
        bodyMd: a.bodyMd ?? '',
        faq: (a.faq as { question: string; answer: string }[]) ?? [],
        sources: (a.sources as { title: string; url: string }[]) ?? [],
        heroImageAlt: a.heroImageAlt ?? '',
        imagePrompt: a.imagePrompt ?? '',
        hasImage: !!a.heroImageType,
        covers,
        status: a.status,
        progress: a.progress,
        error: a.error,
        validationErrors: (a.validationErrors as string[]) ?? [],
        warnings: (a.warnings as string[]) ?? [],
        generator: a.generator,
        reviewedBy: a.reviewedBy,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        updatedAt: a.updatedAt.toISOString(),
      }}
      products={products}
    />
  );
}
