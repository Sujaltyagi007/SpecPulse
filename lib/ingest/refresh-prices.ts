import { prisma } from '@/lib/db';
import { searchGoogleShopping, serpApiConfigFromEnv } from '@/lib/ingest/serpapi';
import { currencyForGl, pickOffers, retailerDomain, retailerSlug } from '@/lib/ingest/normalize';

async function ensureRetailer(name: string, domain: string | null): Promise<number> {
  if (domain) {
    const byDomain = await prisma.retailer.findUnique({ where: { domain } });
    if (byDomain) return byDomain.id;
  }
  const slug = retailerSlug(name);
  const existing = await prisma.retailer.findUnique({ where: { slug } });
  if (existing) {
    if (!existing.domain && domain) await prisma.retailer.update({ where: { id: existing.id }, data: { domain } });
    return existing.id;
  }
  return (await prisma.retailer.create({ data: { slug, name, domain } })).id;
}

export interface RefreshResult {
  runId: number;
  itemsOk: number;
  itemsFailed: number;
  apiCalls: number;
  touched: { categorySlug: string; slug: string }[];
}

export async function refreshPrices(
  log: (msg: string) => void = () => { },
  opts: { productIds?: number[] } = {},
): Promise<RefreshResult> {
  const cfg = await serpApiConfigFromEnv();
  const currency = currencyForGl(cfg.gl);
  const maxCalls = Number(process.env.INGEST_MAX_CALLS ?? 100);

  const run = await prisma.ingestRun.create({ data: { job: opts.productIds ? 'refresh-prices:serpapi:manual' : 'refresh-prices:serpapi' } });
  const result: RefreshResult = { runId: run.id, itemsOk: 0, itemsFailed: 0, apiCalls: 0, touched: [] };
  let fatal: string | undefined;

  try {
    const products = await prisma.product.findMany({
      where: opts.productIds ? { id: { in: opts.productIds } } : { status: { not: 'archived' } },
      include: { category: true, offers: { select: { lastSeenAt: true } } },
    });
    const lastSeen = (p: (typeof products)[number]) => Math.max(0, ...p.offers.map((o) => o.lastSeenAt.getTime()));
    products.sort((a, b) => lastSeen(a) - lastSeen(b));

    for (const p of products.slice(0, maxCalls)) {
      try {
        result.apiCalls++;
        const results = await searchGoogleShopping(p.gtin ?? `${p.brand} ${p.model}`, cfg);
        const offers = pickOffers(p, results);
        for (const o of offers) {
          const retailerId = await ensureRetailer(o.retailerName, retailerDomain(o.sourceUrl));
          const data = {
            source: 'serpapi' as const,
            sourceUrl: o.sourceUrl,
            externalId: o.externalId,
            priceCents: o.priceCents,
            currency,
            inStock: null,
            lastSeenAt: new Date(),
          };
          await prisma.$transaction(async (tx) => {
            const offer = await tx.offer.upsert({
              where: { productId_retailerId: { productId: p.id, retailerId } },
              create: { productId: p.id, retailerId, ...data },
              update: { ...data, externalId: o.externalId ?? undefined },
            });
            await tx.priceHistory.create({ data: { offerId: offer.id, priceCents: o.priceCents, inStock: null } });
          });
        }
        result.itemsOk++;
        if (offers.length) result.touched.push({ categorySlug: p.category.slug, slug: p.slug });
        log(`${p.title}: ${offers.length} offers from ${results.length} results`);
      } catch (err) {
        result.itemsFailed++;
        log(`${p.title}: ${(err as Error).message}`);
      }
    }
    if (products.length > maxCalls) log(`Stopped at INGEST_MAX_CALLS=${maxCalls}; ${products.length - maxCalls} left for next run.`);
    return result;
  } catch (err) {
    fatal = (err as Error).message;
    throw err;
  } finally {
    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        itemsOk: result.itemsOk,
        itemsFailed: result.itemsFailed,
        apiCalls: result.apiCalls,
        error: fatal ?? null,
      },
    });
  }
}
