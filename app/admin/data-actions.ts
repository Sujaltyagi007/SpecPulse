'use server';
import { prisma } from '@/lib/db';
import { productPath } from '@/lib/site';
import { revalidatePath } from 'next/cache';
import { validateProduct } from '@/lib/validate';
import { currentUsername } from '@/lib/admin-user';
import type { ProductStatus } from '@/lib/generated/prisma/client';

const STATUSES: ProductStatus[] = ['draft', 'review', 'approved', 'published', 'archived'];

export async function getAdminOverview() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [grouped, runs, llmUsage] = await Promise.all([
    prisma.product.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.ingestRun.findMany({ orderBy: { startedAt: 'desc' }, take: 10 }),
    prisma.llmCall.groupBy({
      by: ['provider', 'model', 'keyName', 'ok'],
      where: { createdAt: { gte: weekAgo } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const s of STATUSES) {
    counts[s] = 0;
  }
  for (const g of grouped) {
    counts[g.status] = g._count._all;
  }

  const llmRows = new Map<string, { label: string; ok: number; failed: number; inTok: number; outTok: number }>();
  for (const g of llmUsage) {
    const key = `${g.provider}:${g.model}:${g.keyName}`;
    const row = llmRows.get(key) ?? { label: `${g.model} (${g.keyName})`, ok: 0, failed: 0, inTok: 0, outTok: 0 };
    if (g.ok) row.ok += g._count._all;
    else row.failed += g._count._all;
    row.inTok += g._sum.inputTokens ?? 0;
    row.outTok += g._sum.outputTokens ?? 0;
    llmRows.set(key, row);
  }

  return {
    counts,
    totalProducts: Object.values(counts).reduce((a, b) => a + b, 0),
    runs: runs.map((r) => ({
      id: r.id,
      job: r.job,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      itemsOk: r.itemsOk,
      itemsFailed: r.itemsFailed,
      apiCalls: r.apiCalls,
      error: r.error,
    })),
    llmUsage: Array.from(llmRows.entries()).map(([key, row]) => ({
      key,
      label: row.label,
      ok: row.ok,
      failed: row.failed,
      inTok: row.inTok,
      outTok: row.outTok,
    })),
  };
}

/** Everything the Home view needs: what's waiting on a person, what's about to go live, and system health. */
export async function getHomeData() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [inReview, drafts, draftCount, copy, copyCount, scheduled, live, lastRun, llm] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'review' },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    }),
    prisma.product.findMany({
      where: { status: 'draft' },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.product.count({ where: { status: 'draft' } }),
    prisma.pageContent.findMany({ where: { status: 'review' }, orderBy: { updatedAt: 'asc' }, take: 5 }),
    prisma.pageContent.count({ where: { status: 'review' } }),
    Promise.all([
      prisma.product.count({ where: { status: 'approved' } }),
      prisma.comparison.count({ where: { status: 'approved' } }),
      prisma.roundup.count({ where: { status: 'approved' } }),
    ]),
    Promise.all([
      prisma.product.count({ where: { status: 'published' } }),
      prisma.comparison.count({ where: { status: 'published' } }),
      prisma.roundup.count({ where: { status: 'published' } }),
    ]),
    prisma.ingestRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.llmCall.groupBy({ by: ['ok'], where: { createdAt: { gte: weekAgo } }, _count: { _all: true } }),
  ]);

  const [reviewChecks, draftChecks] = await Promise.all([
    Promise.all(inReview.map((p) => validateProduct(p.id))),
    Promise.all(drafts.map((p) => validateProduct(p.id))),
  ]);
  const ready = inReview.filter((_, i) => reviewChecks[i]!.errors.length === 0);

  return {
    readyToApprove: ready.slice(0, 6).map((p) => ({ id: p.id, title: p.title, category: p.category.name })),
    readyCount: ready.length,
    needsWork: drafts.map((p, i) => ({
      id: p.id,
      title: p.title,
      category: p.category.name,
      nextStep: draftChecks[i]!.errors[0] ?? 'Ready to send to review',
    })),
    needsWorkCount: draftCount,
    copyToReview: copy.map((c) => ({ id: c.id, pageType: c.pageType, pageKey: c.pageKey })),
    copyCount,
    scheduled: { products: scheduled[0], comparisons: scheduled[1], roundups: scheduled[2] },
    live: { products: live[0], comparisons: live[1], roundups: live[2] },
    dailyLimit: Number(process.env.PUBLISH_DAILY_LIMIT ?? 20),
    lastRun: lastRun
      ? {
          at: (lastRun.finishedAt ?? lastRun.startedAt).toISOString(),
          ok: lastRun.itemsOk,
          failed: lastRun.itemsFailed,
          error: lastRun.error,
          running: !lastRun.finishedAt,
        }
      : null,
    ai: {
      ok: llm.find((g) => g.ok)?._count._all ?? 0,
      failed: llm.find((g) => !g.ok)?._count._all ?? 0,
    },
  };
}
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;

export async function getProductCatalog(search?: string, categoryId?: number, status?: string) {
  const where: any = {};
  if (status && status !== 'all') {
    where.status = status;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { gtin: { contains: q } },
      { mpn: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Status counts ignore the status filter so the filter chips can show every count.
  const { status: _status, ...whereWithoutStatus } = where;
  const [products, categories, grouped] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { specs: true, offers: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 80,
    }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.product.groupBy({ by: ['status'], where: whereWithoutStatus, _count: { _all: true } }),
  ]);

  // Fact checks only matter while a product is on its way to approval.
  const checks = await Promise.all(
    products.map((p) => (p.status === 'draft' || p.status === 'review' ? validateProduct(p.id) : null)),
  );

  return {
    categories,
    counts: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<ProductStatus, number>>,
    products: products.map((p, i) => ({
      errors: checks[i]?.errors ?? [],
      warnings: checks[i]?.warnings ?? [],
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      category: p.category,
      gtin: p.gtin,
      mpn: p.mpn,
      imageUrl: p.imageUrl,
      specsCount: p._count.specs,
      offersCount: p._count.offers,
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}

export async function getComparisonsData() {
  const [comparisons, products, copy] = await Promise.all([
    prisma.comparison.findMany({
      include: {
        productA: { select: { id: true, title: true, slug: true, categoryId: true } },
        productB: { select: { id: true, title: true, slug: true, categoryId: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { status: { not: 'archived' } },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ categoryId: 'asc' }, { title: 'asc' }],
    }),
    prisma.pageContent.findMany({ where: { pageType: 'comparison' } }),
  ]);

  const copyBySlug = new Map(copy.map((c) => [c.pageKey, { id: c.id, status: c.status }]));

  return {
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      categoryName: p.category.name,
      categoryId: p.categoryId,
    })),
    comparisons: comparisons.map((c) => ({
      id: c.id,
      slug: c.slug,
      status: c.status,
      productA: c.productA,
      productB: c.productB,
      pageCopy: copyBySlug.get(c.slug) ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function getRoundupsData() {
  const [roundups, categories] = await Promise.all([
    prisma.roundup.findMany({
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return {
    categories,
    roundups: roundups.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      useCase: r.useCase,
      status: r.status,
      category: r.category,
      picksCount: r._count.items,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getContentQueueData(filterStatus?: string) {
  const where: any = {};
  if (filterStatus && filterStatus !== 'all') {
    where.status = filterStatus;
  }

  const rows = await prisma.pageContent.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: 150,
  });

  return rows.map((r) => ({
    id: r.id,
    pageType: r.pageType,
    pageKey: r.pageKey,
    status: r.status,
    generator: r.generator,
    promptVersion: r.promptVersion,
    validationErrors: (r.validationErrors as string[]) || [],
    reviewedBy: r.reviewedBy,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/* API-style Action Handlers with Clean JSON Responses */

export async function apiApproveProduct(id: number) {
  try {
    const { errors } = await validateProduct(id);
    if (errors.length) return { ok: false, error: `Validation failed: ${errors.join('; ')}` };
    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'approved', reviewedBy: await currentUsername(), reviewedAt: new Date() },
    });
    revalidatePath('/admin');
    revalidatePath(`/admin/products/${id}`);
    return { ok: true, product: { id: updated.id, status: updated.status } };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to approve product' };
  }
}

export async function apiSendBackToDraft(id: number) {
  try {
    const updated = await prisma.product.update({ where: { id }, data: { status: 'draft' } });
    revalidatePath('/admin');
    revalidatePath(`/admin/products/${id}`);
    return { ok: true, product: { id: updated.id, status: updated.status } };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to update status' };
  }
}

export async function apiSubmitForReview(id: number) {
  try {
    const { errors } = await validateProduct(id);
    if (errors.length) return { ok: false, error: `Validation failed: ${errors.join('; ')}` };
    const updated = await prisma.product.update({ where: { id }, data: { status: 'review' } });
    revalidatePath('/admin');
    revalidatePath(`/admin/products/${id}`);
    return { ok: true, product: { id: updated.id, status: updated.status } };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to submit for review' };
  }
}

export async function apiArchiveProduct(id: number) {
  try {
    const p = await prisma.product.update({
      where: { id },
      data: { status: 'archived' },
      include: { category: true },
    });
    revalidatePath('/admin');
    revalidatePath(`/admin/products/${id}`);
    revalidatePath('/');
    revalidatePath(productPath(p.category.slug, p.slug));
    return { ok: true, product: { id: p.id, status: p.status } };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to archive product' };
  }
}

export async function apiCreateComparison(productAId: number, productBId: number) {
  try {
    if (productAId === productBId) return { ok: false, error: 'Pick two different products' };
    const products = await prisma.product.findMany({ where: { id: { in: [productAId, productBId] } } });
    if (products.length !== 2) return { ok: false, error: 'Product not found' };
    const [a, b] = products.sort((x, y) => x.slug.localeCompare(y.slug)) as [
      (typeof products)[number],
      (typeof products)[number]
    ];
    if (a.categoryId !== b.categoryId) return { ok: false, error: 'Both products must be in the same category' };

    const comparison = await prisma.comparison.create({
      data: { slug: `${a.slug}-vs-${b.slug}`, productAId: a.id, productBId: b.id },
    });
    revalidatePath('/admin/comparisons');
    return { ok: true, comparison };
  } catch (e: any) {
    if (e.code === 'P2002') return { ok: false, error: 'That comparison already exists' };
    return { ok: false, error: e.message || 'Failed to create comparison' };
  }
}

export async function apiUnpublishComparison(id: number) {
  try {
    const c = await prisma.comparison.update({ where: { id }, data: { status: 'draft' } });
    revalidatePath(`/compare/${c.slug}`);
    revalidatePath('/admin/comparisons');
    return { ok: true, comparison: c };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to unpublish comparison' };
  }
}

export async function apiCreateRoundup(categoryId: number, title: string, useCase?: string) {
  try {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 5) return { ok: false, error: 'Title is too short (min 5 characters)' };
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const roundup = await prisma.roundup.create({
      data: {
        title: cleanTitle,
        useCase: useCase?.trim() || null,
        categoryId,
        slug,
      },
    });
    revalidatePath('/admin/roundups');
    return { ok: true, roundup };
  } catch (e: any) {
    if (e.code === 'P2002') return { ok: false, error: 'A roundup with that title already exists' };
    return { ok: false, error: e.message || 'Failed to create roundup' };
  }
}
