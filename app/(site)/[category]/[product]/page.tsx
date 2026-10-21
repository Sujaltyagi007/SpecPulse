import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Fragment } from 'react/jsx-runtime';
import { formatDate, formatPrice, productPath } from '@/lib/site';
import { Disclosure, Faq, Prose, Updated } from '@/components/copy';
import { BadgeCheck, ExternalLink, ShieldCheck } from 'lucide-react';
import { faqJsonLd, jsonLdString, productJsonLd } from '@/lib/jsonld';
import { getPriceHistory, listComparisonCards, listRoundupCards } from '@/lib/catalog';
import { getProductPage, listPublishedProducts, type ProductPageData } from '@/lib/products';
import { Breadcrumb, ComparisonCard, PriceChart, ProductCard, RoundupCard, SectionHeader } from '@/components/site';

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
  return {
    title: `${p.title}: specs and current prices`,
    description: best ? `${p.title} specs, checked by hand, and prices from ${p.offers.filter((o) => o.live).length} retailers. Lowest today: ${formatPrice(best.priceCents!, best.currency)}.` : `${p.title} specs, checked by hand, with links to current retailer prices.`,
    alternates: { canonical: productPath(p.category.slug, p.slug) },
  };
}

function dataLead(p: ProductPageData) {
  const best = p.offers.find((o) => o.live);
  if (!best) return `${p.title}: we couldn't confirm a current price, so check the retailer links below.`;
  return `The lowest price we found for the ${p.title} is ${formatPrice(best.priceCents!, best.currency)} at ${best.retailer}, checked ${formatDate(best.lastSeenAt)}.`;
}

function PriceCard({ p }: { p: ProductPageData }) {
  const best = p.offers.find((o) => o.live);
  const fallback = p.offers[0];
  const liveCount = p.offers.filter((o) => o.live).length;
  return (
    <div className="panel price-card">
      {p.imageUrl && (
        <div className="price-card-media">
          <img src={p.imageUrl} alt={p.title} />
        </div>
      )}
      {best ? (
        <Fragment>
          <span className="price-label">Lowest price today</span>
          <div className="price">{formatPrice(best.priceCents!, best.currency)}</div>
          <p className="price-card-meta"> at {best.retailer} · checked {formatDate(best.lastSeenAt)} </p>
          <a className="btn btn-lg btn-block" href={best.url} rel="sponsored nofollow noopener" target="_blank"> View at {best.retailer} <ExternalLink size={15} aria-hidden /> </a>
          {liveCount > 1 && (<a href="#prices" className="price-card-more">Compare {liveCount} retailers</a>)}
        </Fragment>
      ) : fallback ? (
        <Fragment>
          <span className="price-label">Price</span>
          <p className="price-card-meta">We couldn&apos;t confirm a current price.</p>
          <a className="btn secondary btn-lg btn-block" href={fallback.url} rel="sponsored nofollow noopener" target="_blank">Check current price <ExternalLink size={15} aria-hidden /> </a>
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

  const specs = p.specs.filter((s) => s.verified);
  const keySpecs = specs.slice(0, 4);
  const faq = faqJsonLd(p);
  const bestId = p.offers.find((o) => o.live)?.id;

  const sections = [
    { id: 'prices', label: 'Prices', show: true },
    { id: 'specs', label: 'Specs', show: specs.length > 0 },
    { id: 'history', label: 'Price history', show: !!history },
    { id: 'take', label: 'Our take', show: !!p.bodyMd },
    { id: 'compare', label: 'Compare', show: comparisons.length > 0 },
    { id: 'faq', label: 'FAQ', show: p.faq.length > 0 },
  ].filter((s) => s.show);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd(p)) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faq) }} />}

      <Breadcrumb items={[{ label: p.category.name, href: `/${p.category.slug}` }, { label: p.title }]} />
      <header className="page-head">
        <div>
          <span className="chip">{p.brand} · {p.category.name}</span>
          <h1>{p.title}</h1>
          <p className="lead">{p.summary ?? dataLead(p)}</p>
        </div>
      </header>

      {sections.length > 1 && (
        <nav className="subnav" aria-label="On this page">
          {sections.map((s) => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
        </nav>
      )}

      <div className="product-layout">
        <aside className="product-aside">
          <PriceCard p={p} />
          <Disclosure>
            If you buy through a retailer link on this page, we may earn a commission. It doesn&apos;t change the price you pay
            or which retailers we list.
          </Disclosure>
        </aside>

        <div className="product-main">
          {keySpecs.length > 0 && (
            <dl className="key-specs">
              {keySpecs.map((s) => (
                <div key={s.key}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}{s.unit ? ` ${s.unit}` : ''}</dd>
                </div>
              ))}
            </dl>
          )}

          <h2 id="prices" className="anchor">Where to buy</h2>
          {p.offers.length === 0 ? (
            <p className="empty">No retailer listings yet.</p>
          ) : (
            <ul className="panel offer-list">
              {p.offers.map((o) => (
                <li key={o.id} className={`offer${o.id === bestId ? ' is-best' : ''}`}>
                  <div className="offer-info">
                    <div className="offer-retailer">
                      {o.retailer}
                      {o.id === bestId && <span className="chip chip-ok">Lowest</span>}
                    </div>
                    <div className="offer-checked">Checked {formatDate(o.lastSeenAt)}</div>
                  </div>
                  <div className="offer-price">
                    {o.inStock === false ? (
                      <span className="muted">Out of stock</span>
                    ) : o.live ? (
                      formatPrice(o.priceCents!, o.currency)
                    ) : (
                      <span className="muted">Check price</span>
                    )}
                  </div>
                  <a className="btn secondary" href={o.url} rel="sponsored nofollow noopener" target="_blank" aria-label={`View at ${o.retailer}`}>
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
                {specs.map((s) => (
                  <div key={s.key} className="spec-row">
                    <dt>{s.label}</dt>
                    <dd> {s.value} {s.unit ? ` ${s.unit}` : ''} </dd>
                  </div>
                ))}
                {p.gtin && (
                  <div className="spec-row">
                    <dt>GTIN</dt>
                    <dd>{p.gtin}</dd>
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

          {p.bodyMd && (
            <Fragment>
              <h2 id="take" className="anchor">Our take</h2>
              <Prose text={p.bodyMd} />
            </Fragment>
          )}

          {comparisons.length > 0 && (
            <Fragment>
              <h2 id="compare" className="anchor">Compare with</h2>
              <div className="compare-grid compare-grid-tight">
                {comparisons.map((c) => <ComparisonCard key={c.slug} c={c} />)}
              </div>
            </Fragment>
          )}

          {roundups.length > 0 && (
            <Fragment>
              <h2>Featured in</h2>
              <div className="roundup-grid">
                {roundups.map((r) => <RoundupCard key={r.slug} r={r} />)}
              </div>
            </Fragment>
          )}

          <div id="faq" className="anchor">
            <Faq items={p.faq} />
          </div>
          <Updated date={p.updatedAt} />
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <SectionHeader title={`More ${p.category.name.toLowerCase()}`} href={`/${p.category.slug}`} linkLabel={`All ${p.category.name.toLowerCase()}`} />
          <div className="product-grid">
            {related.map((r) => <ProductCard key={r.slug} p={r} />)}
          </div>
        </section>
      )}
    </article>
  );
}
