'use server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkCopy } from '@/lib/content/check';
import { PageCopy } from '@/lib/content/prompt';
import { generatePageContent } from '@/lib/content/generate';
import { buildFactSheet, type PageType } from '@/lib/content/facts';

const PAGE_TYPES: PageType[] = ['product', 'comparison', 'roundup'];

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function int(formData: FormData, key: string): number {
  const n = Number(formData.get(key));
  if (!Number.isInteger(n)) throw new Error(`Invalid ${key}`);
  return n;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function withError(path: string, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message.slice(0, 500))}`);
}

export async function generateContent(formData: FormData) {
  const pageType = str(formData, 'pageType') as PageType;
  const pageKey = str(formData, 'pageKey');
  const back = str(formData, 'back') || '/admin/content';
  if (!PAGE_TYPES.includes(pageType) || !pageKey) throw new Error('Invalid page');

  let id: number;
  try {
    id = (await generatePageContent(pageType, pageKey)).id;
  } catch (err) {
    withError(back, err);
  }
  revalidatePath('/admin/content');
  redirect(`/admin/content/${id}`);
}

async function loadCopy(id: number) {
  const row = await prisma.pageContent.findUniqueOrThrow({ where: { id } });
  return { row, facts: await buildFactSheet(row.pageType, row.pageKey) };
}

export async function saveContent(formData: FormData) {
  const id = int(formData, 'id');
  let faq: unknown;
  try {
    faq = JSON.parse(str(formData, 'faq') || '[]');
  } catch {
    withError(`/admin/content/${id}`, new Error('FAQ is not valid JSON'));
  }
  const parsed = PageCopy.safeParse({ summary: str(formData, 'summary'), body: str(formData, 'body'), faq });
  if (!parsed.success) withError(`/admin/content/${id}`, new Error('FAQ must be a list of {"question", "answer"}'));

  const { facts } = await loadCopy(id);
  const errors = checkCopy(parsed.data, facts);
  await prisma.pageContent.update({
    where: { id },
    data: {
      summary: parsed.data.summary,
      bodyMd: parsed.data.body,
      faq: parsed.data.faq,
      validationErrors: errors,
      status: errors.length ? 'draft' : 'review',
      reviewedBy: null,
      reviewedAt: null,
    },
  });
  revalidatePath(`/admin/content/${id}`);
  revalidatePath('/admin/content');
}

export async function approveContent(formData: FormData) {
  const id = int(formData, 'id');
  const { row, facts } = await loadCopy(id);
  const errors = checkCopy({ summary: row.summary ?? '', body: row.bodyMd ?? '', faq: row.faq as PageCopy['faq'] }, facts);
  if (errors.length) {
    await prisma.pageContent.update({ where: { id }, data: { validationErrors: errors, status: 'draft' } });
    withError(`/admin/content/${id}`, new Error(`Checks failed: ${errors.join('; ')}`));
  }

  const reviewer = process.env.ADMIN_USER ?? 'admin';
  await prisma.$transaction([
    prisma.pageContent.update({
      where: { id },
      data: { status: 'approved', validationErrors: [], reviewedBy: reviewer, reviewedAt: new Date() },
    }),
    ...(row.pageType === 'comparison'
      ? [prisma.comparison.updateMany({ where: { slug: row.pageKey, status: { not: 'published' } }, data: { status: 'approved' } })]
      : []),
    ...(row.pageType === 'roundup'
      ? [prisma.roundup.updateMany({ where: { slug: row.pageKey, status: { not: 'published' } }, data: { status: 'approved' } })]
      : []),
  ]);
  revalidatePath(`/admin/content/${id}`);
  revalidatePath('/admin/content');
}

export async function rejectContent(formData: FormData) {
  const id = int(formData, 'id');
  const row = await prisma.pageContent.update({ where: { id }, data: { status: 'draft', reviewedBy: null, reviewedAt: null } });
  if (row.pageType === 'comparison') {
    await prisma.comparison.updateMany({ where: { slug: row.pageKey, status: 'approved' }, data: { status: 'draft' } });
  } else if (row.pageType === 'roundup') {
    await prisma.roundup.updateMany({ where: { slug: row.pageKey, status: 'approved' }, data: { status: 'draft' } });
  }
  revalidatePath(`/admin/content/${id}`);
  revalidatePath('/admin/content');
}

export async function createComparison(formData: FormData) {
  const ids = [int(formData, 'productA'), int(formData, 'productB')];
  try {
    if (ids[0] === ids[1]) throw new Error('Pick two different products');
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    if (products.length !== 2) throw new Error('Product not found');
    const [a, b] = products.sort((x, y) => x.slug.localeCompare(y.slug)) as [(typeof products)[number], (typeof products)[number]];
    if (a.categoryId !== b.categoryId) throw new Error('Both products must be in the same category');
    await prisma.comparison.create({ data: { slug: `${a.slug}-vs-${b.slug}`, productAId: a.id, productBId: b.id } });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') withError('/admin/comparisons', new Error('That comparison already exists'));
    withError('/admin/comparisons', err);
  }
  revalidatePath('/admin/comparisons');
}

export async function createRoundup(formData: FormData) {
  const title = str(formData, 'title');
  const useCase = str(formData, 'useCase') || null;
  const categoryId = int(formData, 'categoryId');
  let id: number;
  try {
    if (title.length < 5) throw new Error('Title is too short');
    id = (await prisma.roundup.create({ data: { title, useCase, categoryId, slug: slugify(title) } })).id;
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') withError('/admin/roundups', new Error('A roundup with that title already exists'));
    withError('/admin/roundups', err);
  }
  redirect(`/admin/roundups/${id}`);
}

export async function saveRoundupItem(formData: FormData) {
  const roundupId = int(formData, 'roundupId');
  const productId = int(formData, 'productId');
  const rank = int(formData, 'rank');
  const label = str(formData, 'label') || null;
  const back = `/admin/roundups/${roundupId}`;
  try {
    const [roundup, product] = await Promise.all([
      prisma.roundup.findUniqueOrThrow({ where: { id: roundupId } }),
      prisma.product.findUniqueOrThrow({ where: { id: productId } }),
    ]);
    if (roundup.status === 'published') throw new Error('Unpublish the roundup before changing its picks');
    if (product.categoryId !== roundup.categoryId) throw new Error('Product is not in this roundup’s category');
    await prisma.roundupItem.upsert({
      where: { roundupId_productId: { roundupId, productId } },
      create: { roundupId, productId, rank, label },
      update: { rank, label },
    });
    await markRoundupChanged(roundupId, roundup.slug);
  } catch (err) {
    withError(back, err);
  }
  revalidatePath(back);
}

export async function removeRoundupItem(formData: FormData) {
  const roundupId = int(formData, 'roundupId');
  const productId = int(formData, 'productId');
  const roundup = await prisma.roundup.findUniqueOrThrow({ where: { id: roundupId } });
  if (roundup.status === 'published') withError(`/admin/roundups/${roundupId}`, new Error('Unpublish the roundup before changing its picks'));
  await prisma.roundupItem.delete({ where: { roundupId_productId: { roundupId, productId } } });
  await markRoundupChanged(roundupId, roundup.slug);
  revalidatePath(`/admin/roundups/${roundupId}`);
}

export async function unpublishPage(formData: FormData) {
  const pageType = str(formData, 'pageType');
  const id = int(formData, 'id');
  if (pageType === 'comparison') {
    const c = await prisma.comparison.update({ where: { id }, data: { status: 'draft' } });
    revalidatePath(`/compare/${c.slug}`);
    revalidatePath('/admin/comparisons');
  } else if (pageType === 'roundup') {
    const r = await prisma.roundup.update({ where: { id }, data: { status: 'draft' } });
    revalidatePath(`/best/${r.slug}`);
    revalidatePath(`/admin/roundups/${id}`);
    revalidatePath('/admin/roundups');
  }
  revalidatePath('/sitemap.xml');
}

async function markRoundupChanged(roundupId: number, slug: string) {
  await prisma.roundup.updateMany({ where: { id: roundupId, status: 'approved' }, data: { status: 'draft' } });
  await prisma.pageContent.updateMany({
    where: { pageType: 'roundup', pageKey: slug, status: { in: ['review', 'approved'] } },
    data: { status: 'draft', validationErrors: ['Picks changed since this copy was written: regenerate or edit it'] },
  });
}
