import { SITE_NAME, SITE_URL, productPath } from '@/lib/site';
import type { FaqItem, ProductPageData } from '@/lib/products';

export function productJsonLd(p: ProductPageData): Record<string, unknown> {
  const live = p.offers.filter((o) => o.live);
  const prices = live.map((o) => o.priceCents!);
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    brand: { '@type': 'Brand', name: p.brand },
    model: p.model,
    url: SITE_URL + productPath(p.category.slug, p.slug),
    ...(p.gtin && { gtin: p.gtin }),
    ...(p.mpn && { mpn: p.mpn }),
    ...(p.imageUrl && { image: p.imageUrl }),
    additionalProperty: p.specs
      .filter((s) => s.verified)
      .map((s) => ({ '@type': 'PropertyValue', name: s.label, value: s.value, ...(s.unit && { unitText: s.unit }) })),
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
  if (prices.length) {
    ld.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: live[0]!.currency,
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: live.length,
    };
  }
  return ld;
}

export function faqJsonLd(page: { faq: FaqItem[] }): Record<string, unknown> | null {
  if (!page.faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function itemListJsonLd(name: string, products: ProductPageData[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: SITE_URL + productPath(p.category.slug, p.slug),
      name: p.title,
    })),
  };
}

export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
