import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail } from './_components/product-detail';
import { formatPrice, productPath, SITE_NAME } from '@/lib/site';
import { getProductPage, listPublishedProducts } from '@/lib/products';
import { getPriceHistory, listComparisonCards, listRoundupCards } from '@/lib/catalog';

export const revalidate = 3600;

type Props = { params: Promise<{ category: string; product: string }> };

export async function generateStaticParams() {
  const products = await listPublishedProducts();
  return products.map((p) => ({ category: p.categorySlug, product: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, product } = await params;
  const p = await getProductPage(category, product);
  if (!p) return {};
  const best = p.offers.find((o) => o.live);
  const title = `${p.title}: specs and current prices`;
  const description = best ? `${p.title} specs, checked by hand, and prices from ${p.offers.filter((o) => o.live).length} retailers. Lowest today: ${formatPrice(best.priceCents!, best.currency)}.` : `${p.title} specs, checked by hand, with links to current retailer prices.`;
  const canonical = productPath(p.category.slug, p.slug);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'website',
      ...(p.imageUrl && { images: [{ url: p.imageUrl, alt: p.title }] }),
    },
    twitter: {
      card: p.imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(p.imageUrl && { images: [p.imageUrl] }),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { category, product } = await params;
  const p = await getProductPage(category, product);
  if (!p) notFound();

  const [history, comparisons, roundups, related] = await Promise.all([
    getPriceHistory(p.id),
    listComparisonCards({ productId: p.id, take: 4 }),
    listRoundupCards({ productId: p.id, take: 3 }),
    listPublishedProducts({ categorySlug: p.category.slug, excludeSlug: p.slug }).then((r) => r.slice(0, 4)),
  ]);

  return <ProductDetail product={p} history={history} comparisons={comparisons} roundups={roundups} related={related} />;
}
