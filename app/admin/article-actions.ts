'use server';
import { z } from 'zod';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { currentUsername } from '@/lib/admin-user';
import { checkArticle } from '@/lib/articles/check';
import { regenerateCover, runArticleJob } from '@/lib/articles/generate';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function revalidateArticle(slug: string) {
  revalidatePath('/');
  revalidatePath('/articles');
  revalidatePath(`/articles/${slug}`);
  revalidatePath('/sitemap.xml');
}

/** Starts generation in the background and returns at once; the list polls for progress. */
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

export async function apiNewCover(id: number): Promise<Result<{ warnings: string[] }>> {
  try {
    const warnings = await regenerateCover(id);
    const a = await prisma.article.findUniqueOrThrow({ where: { id } });
    if (a.status === 'published') revalidateArticle(a.slug);
    return { ok: true, warnings };
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
});

/** Saves an editor's changes and re-runs the checks. A live article can't be saved into a failing state. */
export async function apiSaveArticle(id: number, input: z.input<typeof ArticleEdit>): Promise<Result<{ errors: string[]; warnings: string[] }>> {
  const parsed = ArticleEdit.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid article' };
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a) return { ok: false, error: 'Article not found' };

  const sources = (a.sources as { title: string; url: string }[]) ?? [];
  const researched = !((a.warnings as string[]) ?? []).some((w) => w.startsWith('No web research'));
  const { errors, warnings } = checkArticle({ ...parsed.data, sourceCount: sources.length, researched });
  const keptWarnings = ((a.warnings as string[]) ?? []).filter((w) => w.startsWith('Cover is'));
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

/** Publishes immediately once the checks pass. */
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
