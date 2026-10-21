'use server';
import { prisma } from '@/lib/db';
import { productPath } from '@/lib/site';
import { revalidatePath } from 'next/cache';
import { validateProduct } from '@/lib/validate';
import { redirect } from 'next/navigation';
import { currentUsername } from '@/lib/admin-user';
import { refreshPrices } from '@/lib/ingest/refresh-prices';

function productId(formData: FormData): number {
  const id = Number(formData.get('productId'));
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid product id');
  return id;
}

function optional(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? '').trim();
  return v === '' ? null : v;
}

function refresh(id: number) {
  revalidatePath('/admin');
  revalidatePath(`/admin/products/${id}`);
}

export async function submitForReview(formData: FormData) {
  const id = productId(formData);
  const { errors } = await validateProduct(id);
  if (errors.length) throw new Error(`Validation failed: ${errors.join('; ')}`);
  await prisma.product.update({ where: { id }, data: { status: 'review' } });
  refresh(id);
}

export async function approveProduct(formData: FormData) {
  const id = productId(formData);
  const { errors } = await validateProduct(id);
  if (errors.length) throw new Error(`Validation failed: ${errors.join('; ')}`);
  await prisma.product.update({
    where: { id },
    data: { status: 'approved', reviewedBy: await currentUsername(), reviewedAt: new Date() },
  });
  refresh(id);
}

export async function sendBackToDraft(formData: FormData) {
  const id = productId(formData);
  await prisma.product.update({ where: { id }, data: { status: 'draft' } });
  refresh(id);
}

export async function archiveProduct(formData: FormData) {
  const id = productId(formData);
  const p = await prisma.product.update({ where: { id }, data: { status: 'archived' }, include: { category: true } });
  refresh(id);
  revalidatePath('/');
  revalidatePath(productPath(p.category.slug, p.slug));
}

export async function updateIdentifiers(formData: FormData) {
  const id = productId(formData);
  const gtin = optional(formData, 'gtin')?.replace(/\D/g, '') || null;
  await prisma.product.update({
    where: { id },
    data: { gtin, mpn: optional(formData, 'mpn'), imageUrl: optional(formData, 'imageUrl') },
  });
  refresh(id);
}

export async function saveSpec(formData: FormData) {
  const id = productId(formData);
  const key = optional(formData, 'key');
  const value = optional(formData, 'value');
  if (!key) throw new Error('Spec key is required');

  if (!value) {
    await prisma.productSpec.deleteMany({ where: { productId: id, key } });
    refresh(id);
    return;
  }

  const verified = formData.get('verified') === 'on';
  const sourceRef = optional(formData, 'sourceRef');
  const existing = await prisma.productSpec.findUnique({ where: { productId_key: { productId: id, key } } });
  const verifiedAt = verified ? (existing?.value === value && existing.verifiedAt ? existing.verifiedAt : new Date()) : null;

  await prisma.productSpec.upsert({
    where: { productId_key: { productId: id, key } },
    create: { productId: id, key, value, sourceRef, verifiedAt, source: 'manual' },
    update: { value, sourceRef, verifiedAt },
  });
  refresh(id);
}

function failTo(path: string, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  redirect(`${path}?error=${encodeURIComponent(message.slice(0, 500))}`);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function createProduct(formData: FormData) {
  const categoryId = Number(formData.get('categoryId'));
  const brand = optional(formData, 'brand');
  const model = optional(formData, 'model');
  const gtin = optional(formData, 'gtin')?.replace(/\D/g, '') || null;
  let id: number;
  try {
    if (!Number.isInteger(categoryId) || !brand || !model) throw new Error('Category, brand and model are required');
    const title = optional(formData, 'title') ?? `${brand} ${model}`;
    const base = slugify(title);
    let slug = base;
    for (let n = 2; await prisma.product.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
    id = (await prisma.product.create({ data: { categoryId, brand, model, title, gtin, slug } })).id;
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') failTo('/admin/products/new', new Error('A product with that GTIN already exists'));
    failTo('/admin/products/new', err);
  }
  revalidatePath('/admin');
  redirect(`/admin/products/${id}`);
}

export async function findPricesNow(formData: FormData) {
  const id = productId(formData);
  try {
    const r = await refreshPrices(() => { }, { productIds: [id] });
    if (r.itemsFailed) throw new Error('The price search failed. See System details on Home for the error.');
  } catch (err) {
    failTo(`/admin/products/${id}`, err);
  }
  refresh(id);
}

export async function publishNow(formData: FormData) {
  const id = productId(formData);
  const p = await prisma.product.findUniqueOrThrow({ where: { id }, include: { category: true } });
  if (p.status !== 'review' && p.status !== 'approved') failTo(`/admin/products/${id}`, new Error('Only products in review or scheduled can be published'));
  const { errors } = await validateProduct(id);
  if (errors.length) failTo(`/admin/products/${id}`, new Error(`Can't publish yet: ${errors.join('; ')}`));

  const now = new Date();
  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: p.publishedAt ?? now,
        reviewedBy: p.reviewedBy ?? (await currentUsername()),
        reviewedAt: p.reviewedAt ?? now,
      },
    }),
    prisma.pageContent.updateMany({
      where: { pageType: 'product', pageKey: p.slug, status: 'approved' },
      data: { status: 'published' },
    }),
  ]);
  refresh(id);
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  revalidatePath(productPath(p.category.slug, p.slug));
}


export async function deleteProduct(formData: FormData) {
  const id = productId(formData);
  const p = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: {
      category: true,
      comparisonsA: { select: { slug: true } },
      comparisonsB: { select: { slug: true } },
      roundupItems: { select: { roundup: { select: { id: true, slug: true } } } },
    },
  });
  const comparisonSlugs = [...p.comparisonsA, ...p.comparisonsB].map((c) => c.slug);
  const roundups = p.roundupItems.map((i) => i.roundup);

  await prisma.$transaction([
    prisma.pageContent.deleteMany({
      where: {
        OR: [
          { pageType: 'product', pageKey: p.slug },
          { pageType: 'comparison', pageKey: { in: comparisonSlugs } },
        ],
      },
    }),
    prisma.product.delete({ where: { id } }),
    prisma.roundup.updateMany({ where: { id: { in: roundups.map((r) => r.id) } }, data: { status: 'draft' } }),
    prisma.pageContent.updateMany({
      where: { pageType: 'roundup', pageKey: { in: roundups.map((r) => r.slug) } },
      data: { status: 'draft', validationErrors: [`${p.title} was deleted: update the picks and regenerate this copy`] },
    }),
  ]);

  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  revalidatePath(productPath(p.category.slug, p.slug));
  for (const slug of comparisonSlugs) revalidatePath(`/compare/${slug}`);
  for (const r of roundups) revalidatePath(`/best/${r.slug}`);
  revalidatePath('/admin', 'layout');
  redirect(`/admin?tab=products&deleted=${encodeURIComponent(p.title)}`);
}
