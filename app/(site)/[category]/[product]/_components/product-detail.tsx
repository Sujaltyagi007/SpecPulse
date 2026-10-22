import { Fragment } from 'react';
import { formatDate, formatPrice, productPath } from '@/lib/site';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { ProductPriceCard } from './product-price-card';
import { Disclosure, Faq, Prose, Updated } from '@/components/copy';
import { breadcrumbJsonLd, faqJsonLd, jsonLdString, productJsonLd } from '@/lib/jsonld';
import type { ProductPageData, listPublishedProducts } from '@/lib/products';
import type { getPriceHistory, listComparisonCards, listRoundupCards } from '@/lib/catalog';
import { Breadcrumb, ComparisonCard, PriceChart, ProductCard, RoundupCard, SectionHeader } from '@/components/site';

type ProductDetailProps = {
  product: ProductPageData;
  history: Awaited<ReturnType<typeof getPriceHistory>>;
  comparisons: Awaited<ReturnType<typeof listComparisonCards>>;
  roundups: Awaited<ReturnType<typeof listRoundupCards>>;
  related: Awaited<ReturnType<typeof listPublishedProducts>>;
};

function dataLead(product: ProductPageData) {
  const best = product.offers.find((offer) => offer.live);
  if (!best) return `${product.title}: we couldn't confirm a current price, so check the retailer links below.`;
  return `The lowest price we found for the ${product.title} is ${formatPrice(best.priceCents!, best.currency)} at ${best.retailer}, checked ${formatDate(best.lastSeenAt)}.`;
}

export function ProductDetail({ product, history, comparisons, roundups, related }: ProductDetailProps) {
  const specs = product.specs.filter((spec) => spec.verified);
  const keySpecs = specs.slice(0, 4);
  const faq = faqJsonLd(product);
  const bestId = product.offers.find((offer) => offer.live)?.id;

  const sections = [
    { id: 'prices', label: 'Prices', show: true },
    { id: 'specs', label: 'Specs', show: specs.length > 0 },
    { id: 'history', label: 'Price history', show: !!history },
    { id: 'take', label: 'Our take', show: !!product.bodyMd },
    { id: 'compare', label: 'Compare', show: comparisons.length > 0 },
    { id: 'faq', label: 'FAQ', show: product.faq.length > 0 },
  ].filter((section) => section.show);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd(product)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: product.category.name, path: `/${product.category.slug}` },
            { name: product.title, path: productPath(product.category.slug, product.slug) },
          ])),
        }}
      />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faq) }} />}

      <Breadcrumb items={[{ label: product.category.name, href: `/${product.category.slug}` }, { label: product.title }]} />
      <header className="page-head">
        <div>
          <span className="chip">{product.brand} · {product.category.name}</span>
          <h1>{product.title}</h1>
          <p className="lead">{product.summary ?? dataLead(product)}</p>
        </div>
      </header>

      {sections.length > 1 && (
        <nav className="subnav" aria-label="On this page">
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}
        </nav>
      )}

      <div className="product-layout">
        <aside className="product-aside">
          <ProductPriceCard product={product} />
          <Disclosure>
            If you buy through a retailer link on this page, we may earn a commission. It doesn&apos;t change the price you pay
            or which retailers we list.
          </Disclosure>
        </aside>

        <div className="product-main">
          {keySpecs.length > 0 && (
            <dl className="key-specs">
              {keySpecs.map((spec) => (
                <div key={spec.key}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}{spec.unit ? ` ${spec.unit}` : ''}</dd>
                </div>
              ))}
            </dl>
          )}

          <h2 id="prices" className="anchor">Where to buy</h2>
          {product.offers.length === 0 ? (
            <p className="empty">No retailer listings yet.</p>
          ) : (
            <ul className="panel offer-list">
              {product.offers.map((offer) => (
                <li key={offer.id} className={`offer${offer.id === bestId ? ' is-best' : ''}`}>
                  <div className="offer-info">
                    <div className="offer-retailer">
                      {offer.retailer}
                      {offer.id === bestId && <span className="chip chip-ok">Lowest</span>}
                    </div>
                    <div className="offer-checked">Checked {formatDate(offer.lastSeenAt)}</div>
                  </div>
                  <div className="offer-price">
                    {offer.inStock === false ? (
                      <span className="muted">Out of stock</span>
                    ) : offer.live ? (
                      formatPrice(offer.priceCents!, offer.currency)
                    ) : (
                      <span className="muted">Check price</span>
                    )}
                  </div>
                  <a className="btn secondary" href={offer.url} rel="sponsored nofollow noopener" target="_blank" aria-label={`View at ${offer.retailer}`}>
                    View <ExternalLink size={14} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}

          {specs.length > 0 && (
            <Fragment>
              <h2 id="specs" className="anchor">
                Specifications{' '}
                <span className="chip chip-ok" style={{ verticalAlign: 'middle', marginLeft: 6 }}>
                  <BadgeCheck size={13} aria-hidden /> Verified
                </span>
              </h2>
              <dl className="panel spec-list">
                {specs.map((spec) => (
                  <div key={spec.key} className="spec-row">
                    <dt>{spec.label}</dt>
                    <dd> {spec.value} {spec.unit ? ` ${spec.unit}` : ''} </dd>
                  </div>
                ))}
                {product.gtin && (
                  <div className="spec-row">
                    <dt>GTIN</dt>
                    <dd>{product.gtin}</dd>
                  </div>
                )}
              </dl>
            </Fragment>
          )}

          {history && (
            <Fragment>
              <h2 id="history" className="anchor">Price history</h2>
              <p className="muted section-note">Lowest in-stock price across retailers, by day, over the last 90 days.</p>
              <PriceChart currency={history.currency} points={history.points} />
            </Fragment>
          )}

          {product.bodyMd && (
            <Fragment>
              <h2 id="take" className="anchor">Our take</h2>
              <Prose text={product.bodyMd} />
            </Fragment>
          )}

          {comparisons.length > 0 && (
            <Fragment>
              <h2 id="compare" className="anchor">Compare with</h2>
              <div className="compare-grid compare-grid-tight">
                {comparisons.map((comparison) => <ComparisonCard key={comparison.slug} c={comparison} />)}
              </div>
            </Fragment>
          )}

          {roundups.length > 0 && (
            <Fragment>
              <h2>Featured in</h2>
              <div className="roundup-grid">
                {roundups.map((roundup) => <RoundupCard key={roundup.slug} r={roundup} />)}
              </div>
            </Fragment>
          )}

          <div id="faq" className="anchor"><Faq items={product.faq} /> </div>
          <Updated date={product.updatedAt} />
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <SectionHeader title={`More ${product.category.name.toLowerCase()}`} href={`/${product.category.slug}`} linkLabel={`All ${product.category.name.toLowerCase()}`} />
          <div className="product-grid">
            {related.map((item) => <ProductCard key={item.slug} p={item} />)}
          </div>
        </section>
      )}
    </article>
  );
}
