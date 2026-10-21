export const SITE_NAME = 'SpecPulse';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function productPath(categorySlug: string, slug: string): string {
  return `/${categorySlug}/${slug}`;
}

export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}

export const NAV_LINKS = [
  { href: '/compare', label: 'Compare' },
  { href: '/best', label: 'Best picks' },
  { href: '/articles', label: 'Guides' },
] as const;
