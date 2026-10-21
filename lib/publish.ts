import { prisma } from '@/lib/db';
import { productPath } from '@/lib/site';
import { validateProduct } from '@/lib/validate';

export interface PublishResult {
  paths: string[];
  published: string[];
  sentBackToDraft: string[];
  waiting: number;
  dailyLimit: number;
}


export async function publishBatch(log: (msg: string) => void = () => {}): Promise<PublishResult> {
  const dailyLimit = Number(process.env.PUBLISH_DAILY_LIMIT ?? 20);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const since = { publishedAt: { gte: startOfDay } };
  const [p, c, r] = await Promise.all([
    prisma.product.count({ where: since }),
    prisma.comparison.count({ where: since }),
    prisma.roundup.count({ where: since }),
  ]);
  const today = p + c + r;
  let budget = Math.max(0, dailyLimit - today);
  const result: PublishResult = { paths: [], published: [], sentBackToDraft: [], waiting: 0, dailyLimit };

  // 1. Products
  const products = await prisma.product.findMany({
    where: { status: 'approved' },
    include: { category: true },
    orderBy: { reviewedAt: 'asc' },
  });
  for (const prod of products) {
    if (budget === 0) {
      result.waiting++;
      continue;
    }
    const { errors } = await validateProduct(prod.id);
    if (errors.length) {
      await prisma.product.update({ where: { id: prod.id }, data: { status: 'draft' } });
      result.sentBackToDraft.push(prod.slug);
      log(`skip ${prod.slug} (back to draft): ${errors.join('; ')}`);
      continue;
    }
    await prisma.product.update({ where: { id: prod.id }, data: { status: 'published', publishedAt: prod.publishedAt ?? new Date() } });
    budget--;
    result.published.push(prod.slug);
    result.paths.push(productPath(prod.category.slug, prod.slug));
    log(`published product ${prod.slug}`);
  }

  const comparisons = await prisma.comparison.findMany({
    where: { status: 'approved' },
    include: { productA: true, productB: true },
    orderBy: { updatedAt: 'asc' },
  });
  for (const cmp of comparisons) {
    if (cmp.productA.status !== 'published' || cmp.productB.status !== 'published') {
      log(`wait ${cmp.slug}: both products must be published first`);
      result.waiting++;
      continue;
    }
    if (budget === 0) {
      result.waiting++;
      continue;
    }
    await prisma.$transaction([
      prisma.comparison.update({ where: { id: cmp.id }, data: { status: 'published', publishedAt: cmp.publishedAt ?? new Date() } }),
      prisma.pageContent.updateMany({ where: { pageType: 'comparison', pageKey: cmp.slug, status: 'approved' }, data: { status: 'published' } }),
    ]);
    budget--;
    result.published.push(cmp.slug);
    result.paths.push(`/compare/${cmp.slug}`);
    log(`published comparison ${cmp.slug}`);
  }

  // 3. Roundups: every pick must be live.
  const roundups = await prisma.roundup.findMany({
    where: { status: 'approved' },
    include: { items: { include: { product: true } } },
    orderBy: { updatedAt: 'asc' },
  });
  for (const rnd of roundups) {
    const notLive = rnd.items.filter((i) => i.product.status !== 'published');
    if (rnd.items.length < 2 || notLive.length) {
      log(`wait ${rnd.slug}: needs at least 2 picks, all published (${notLive.length} not published)`);
      result.waiting++;
      continue;
    }
    if (budget === 0) {
      result.waiting++;
      continue;
    }
    await prisma.$transaction([
      prisma.roundup.update({ where: { id: rnd.id }, data: { status: 'published', publishedAt: rnd.publishedAt ?? new Date() } }),
      prisma.pageContent.updateMany({ where: { pageType: 'roundup', pageKey: rnd.slug, status: 'approved' }, data: { status: 'published' } }),
    ]);
    budget--;
    result.published.push(rnd.slug);
    result.paths.push(`/best/${rnd.slug}`);
    log(`published roundup ${rnd.slug}`);
  }

  const approvedCopy = await prisma.pageContent.findMany({ where: { status: 'approved' } });
  for (const copy of approvedCopy) {
    let path: string | null = null;
    if (copy.pageType === 'product') {
      const prod = await prisma.product.findUnique({ where: { slug: copy.pageKey }, include: { category: true } });
      if (prod?.status === 'published') path = productPath(prod.category.slug, prod.slug);
    } else if (copy.pageType === 'comparison') {
      const cmp = await prisma.comparison.findUnique({ where: { slug: copy.pageKey } });
      if (cmp?.status === 'published') path = `/compare/${cmp.slug}`;
    } else {
      const rnd = await prisma.roundup.findUnique({ where: { slug: copy.pageKey } });
      if (rnd?.status === 'published') path = `/best/${rnd.slug}`;
    }
    if (!path) continue;
    await prisma.pageContent.update({ where: { id: copy.id }, data: { status: 'published' } });
    result.paths.push(path);
    log(`published copy for ${path}`);
  }

  log(`Published ${result.published.length} new pages (limit ${dailyLimit}/day, ${today} earlier today, ${result.waiting} waiting).`);
  return result;
}
