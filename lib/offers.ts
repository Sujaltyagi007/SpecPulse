export const OFFER_STALE_HOURS = 72;

export function staleCutoff(now = new Date()): Date {
  return new Date(now.getTime() - OFFER_STALE_HOURS * 3_600_000);
}

export function isLiveOffer(o: { priceCents: number | null; inStock: boolean | null; lastSeenAt: Date }, now = new Date()): boolean {
  return o.priceCents != null && o.inStock !== false && o.lastSeenAt >= staleCutoff(now);
}
