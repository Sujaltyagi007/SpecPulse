import type { ShoppingResult } from '@/lib/ingest/serpapi';

const CURRENCY_BY_GL: Record<string, string> = { us: 'USD', ca: 'CAD', uk: 'GBP', gb: 'GBP', au: 'AUD', in: 'INR', de: 'EUR', fr: 'EUR', es: 'EUR', it: 'EUR', nl: 'EUR', ie: 'EUR' };

export function currencyForGl(gl: string): string {
  return CURRENCY_BY_GL[gl.toLowerCase()] ?? 'USD';
}

export function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
const ACCESSORY_WORDS = /\b(case|cover|skin|replacement|ear ?tips?|eartips|charger|cable|strap|sticker|protector)\b/i;

export interface MatchTarget {
  brand: string;
  model: string;
}

export function isMatchingListing(target: MatchTarget, r: ShoppingResult): boolean {
  if (r.second_hand_condition) return false;
  if (ACCESSORY_WORDS.test(r.title)) return false;
  const title = compact(r.title);
  const coreModel = compact(target.model.split('(')[0] ?? target.model);
  if (!coreModel || !title.includes(compact(target.brand)) || !title.includes(coreModel)) return false;
  const after = title.slice(title.indexOf(coreModel) + coreModel.length);
  return !/^\d/.test(after);
}

export function amazonAsin(url: string): string | null {
  const m = /amazon\.[a-z.]+\/(?:.*\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i.exec(url);
  return m ? m[1]!.toUpperCase() : null;
}

export function retailerDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return /(^|\.)google\.[a-z.]+$/.test(host) ? null : host;
  } catch {
    return null;
  }
}

export function retailerSlug(name: string): string {
  return name.toLowerCase().replace(/\.(com|net|co\.uk|ca|com\.au|de|in)$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export interface NormalizedOffer {
  retailerName: string;
  sourceUrl: string;
  externalId: string | null;
  priceCents: number;
}

export function pickOffers(target: MatchTarget, results: ShoppingResult[]): NormalizedOffer[] {
  const best = new Map<string, NormalizedOffer>();
  for (const r of results) {
    const url = r.link ?? r.product_link;
    if (!r.source || !url || r.extracted_price == null || r.extracted_price <= 0) continue;
    if (!isMatchingListing(target, r)) continue;

    const offer: NormalizedOffer = {
      retailerName: r.source.trim(),
      sourceUrl: url,
      externalId: amazonAsin(url) ?? r.product_id ?? null,
      priceCents: Math.round(r.extracted_price * 100),
    };
    const key = retailerSlug(offer.retailerName);
    const current = best.get(key);
    if (!current || offer.priceCents < current.priceCents) best.set(key, offer);
  }
  return [...best.values()];
}
