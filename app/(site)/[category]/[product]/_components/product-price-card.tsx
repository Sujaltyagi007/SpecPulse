import { Fragment } from 'react';
import { formatDate, formatPrice } from '@/lib/site';
import type { ProductPageData } from '@/lib/products';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export function ProductPriceCard({ product }: { product: ProductPageData }) {
  const best = product.offers.find((offer) => offer.live);
  const fallback = product.offers[0];
  const liveCount = product.offers.filter((offer) => offer.live).length;

  return (
    <div className="panel price-card">
      {product.imageUrl && (
        <div className="price-card-media">
          <img src={product.imageUrl} alt={product.title} />
        </div>
      )}
      {best ? (
        <Fragment>
          <span className="price-label">Lowest price today</span>
          <div className="price">{formatPrice(best.priceCents!, best.currency)}</div>
          <p className="price-card-meta"> at {best.retailer} · checked {formatDate(best.lastSeenAt)} </p>
          <a className="btn btn-lg btn-block" href={best.url} rel="sponsored nofollow noopener" target="_blank">
            View at {best.retailer} <ExternalLink size={15} aria-hidden />
          </a>
          {liveCount > 1 && <a href="#prices" className="price-card-more">Compare {liveCount} retailers</a>}
        </Fragment>
      ) : fallback ? (
        <Fragment>
          <span className="price-label">Price</span>
          <p className="price-card-meta">We couldn&apos;t confirm a current price.</p>
          <a className="btn secondary btn-lg btn-block" href={fallback.url} rel="sponsored nofollow noopener" target="_blank">
            Check current price <ExternalLink size={15} aria-hidden />
          </a>
        </Fragment>
      ) : (
        <p className="price-card-meta" style={{ margin: 0 }}>No retailer listings yet.</p>
      )}
      <p className="price-card-foot">
        <ShieldCheck size={14} aria-hidden /> Specs verified by a person
      </p>
    </div>
  );
}
