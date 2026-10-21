import { CalendarClock, ExternalLink, Info } from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/site';
import { Fragment } from 'react/jsx-runtime';
import type { FaqItem, ProductPageData } from '@/lib/products';

export function Prose({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="prose">
      {text.split(/\n{2,}/).map((para, i) => (<p key={i}>{para}</p>))}
    </div>
  );
}

export function Faq({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;
  return (
    <Fragment>
      <h2>Frequently asked questions</h2>
      <div className="faq">
        {items.map((f) => (
          <details key={f.question}>
            <summary>{f.question}</summary>
            <p>{f.answer}</p>
          </details>
        ))}
      </div>
    </Fragment>
  );
}

export function Disclosure({ children }: { children?: React.ReactNode }) {
  return (
    <p className="disclosure">
      <Info size={15} aria-hidden />
      <span>
        {children ?? (
          <Fragment>
            If you buy through a retailer link on this page, we may earn a commission. It doesn&apos;t change the price you pay
            or which products we list.
          </Fragment>
        )}
      </span>
    </p>
  );
}

export function Updated({ date }: { date: Date }) {
  return (
    <p className="updated">
      <CalendarClock size={14} aria-hidden /> Last updated {formatDate(date)}
    </p>
  );
}

export function BestPrice({ product, block }: { product: ProductPageData; block?: boolean }) {
  const best = product.offers.find((o) => o.live);
  const fallback = product.offers[0];
  const cls = block ? ' btn-block' : '';
  if (best) {
    return (
      <a className={`btn${cls}`} href={best.url} rel="sponsored nofollow noopener" target="_blank">
        {formatPrice(best.priceCents!, best.currency)} at {best.retailer} <ExternalLink size={14} aria-hidden />
      </a>
    );
  }
  if (fallback) {
    return (
      <a className={`btn secondary${cls}`} href={fallback.url} rel="sponsored nofollow noopener" target="_blank">
        Check current price <ExternalLink size={14} aria-hidden />
      </a>
    );
  }
  return <span className="muted">No listings yet</span>;
}
