import Link from 'next/link';
import { ArrowRight, Flame, ShieldCheck, Sparkles, TrendingUp, CheckCircle } from 'lucide-react';
import type { CategoryItem, ProductListItem } from '@/lib/catalog';
import { formatPrice, productPath } from '@/lib/site';
import { SearchForm } from './ui';

interface ArticleData {
  slug: string;
  title: string | null;
  summary?: string | null;
  heroImageType: string | null;
  heroImageAlt: string | null;
  publishedAt?: Date | null;
  updatedAt: Date;
}

interface TrendingHeroBannerProps {
  latestProducts: ProductListItem[];
  featuredArticle?: ArticleData | null;
  categories: CategoryItem[];
  stats: { products: number; retailers: number; guides: number };
}

export function TrendingHeroBanner({
  latestProducts,
  featuredArticle,
  categories,
  stats,
}: TrendingHeroBannerProps) {
  const topProduct = latestProducts[0];

  return (
    <section className="trending-hero-section" aria-label="Latest and trending tech">
      <div className="trending-hero-grid">
        {/* Left Column: Core Value Proposition & Search */}
        <div className="trending-hero-content">
          <div className="eyebrow">
            <span className="pulse-dot" aria-hidden />
            <span>Verified Specs · Checked Daily by Humans</span>
          </div>

          <h1 className="hero-title">
            Verified specs. <span className="gradient-text">Live prices.</span> Unbiased tech choices.
          </h1>

          <p className="hero-lead">
            Find the right tech without guesswork. Every specification is verified against manufacturer standards,
            and prices are refreshed every morning across major retailers.
          </p>

          <SearchForm size="lg" />

          {categories.length > 0 && (
            <div className="quick-links">
              <span style={{ fontWeight: 600 }}>Popular:</span>
              {categories.slice(0, 5).map((c) => (
                <Link key={c.slug} href={`/${c.slug}`} className="pill">
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          {stats.products > 0 && (
            <dl className="stats-strip">
              <div>
                <dt>Products verified</dt>
                <dd>{stats.products}</dd>
              </div>
              <div>
                <dt>Retailers tracked</dt>
                <dd>{stats.retailers}</dd>
              </div>
              <div>
                <dt>Buying guides</dt>
                <dd>{stats.guides}</dd>
              </div>
              <div>
                <dt>Price audits</dt>
                <dd>Daily</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Right Column: Latest & Trending Spotlight Banner */}
        <div className="trending-spotlight-wrapper">
          <div className="trending-card">
            {/* Spotlight Header Bar */}
            <div className="trending-card-top">
              <span className="trending-badge-hot">
                <Flame size={13} />
                <span>TRENDING NOW</span>
              </span>
              <span className="trending-badge-verified">
                <ShieldCheck size={12} />
                <span>VERIFIED SPECS</span>
              </span>
            </div>

            {/* Spotlight Media */}
            <div className="trending-media-box">
              {featuredArticle?.heroImageType ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/articles/${featuredArticle.slug}/cover?v=${featuredArticle.updatedAt.getTime()}`}
                  alt={featuredArticle.heroImageAlt ?? ''}
                  className="trending-media-img"
                  loading="eager"
                />
              ) : topProduct?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={topProduct.imageUrl}
                  alt={topProduct.title}
                  className="trending-product-img"
                  loading="eager"
                />
              ) : (
                <div className="trending-fallback-art">
                  <Sparkles size={44} style={{ opacity: 0.8 }} />
                  <span style={{ fontSize: '0.8125rem', marginTop: 8, fontWeight: 600 }}>
                    Ground-Truth Tech Database
                  </span>
                </div>
              )}
              <div className="trending-media-glow" aria-hidden />
            </div>

            {/* Spotlight Content */}
            <div className="trending-card-info">
              {featuredArticle ? (
                <>
                  <div className="trending-card-kicker">
                    <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
                    <span>Featured Buying Guide · In-Depth Spec Audit</span>
                  </div>
                  <h3 className="trending-card-title">
                    <Link href={`/articles/${featuredArticle.slug}`}>
                      {featuredArticle.title}
                    </Link>
                  </h3>
                  {featuredArticle.summary && (
                    <p className="trending-card-summary">
                      {featuredArticle.summary}
                    </p>
                  )}
                  <div className="trending-card-actions">
                    <Link href={`/articles/${featuredArticle.slug}`} className="btn btn-block">
                      <span>Read Guide</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </>
              ) : topProduct ? (
                <>
                  <div className="trending-card-kicker">
                    <span>{topProduct.brand} · {topProduct.categoryName}</span>
                  </div>
                  <h3 className="trending-card-title">
                    <Link href={productPath(topProduct.categorySlug, topProduct.slug)}>
                      {topProduct.title}
                    </Link>
                  </h3>

                  <div className="trending-spec-pills">
                    <span className="trending-pill"><CheckCircle size={11} /> 100% Verified Specs</span>
                    <span className="trending-pill">Checked Today</span>
                  </div>

                  <div className="trending-price-row">
                    <div>
                      <span className="price-label">Today&apos;s lowest price</span>
                      <div className="trending-price">
                        {topProduct.bestPrice
                          ? formatPrice(topProduct.bestPrice.cents, topProduct.bestPrice.currency)
                          : 'Live stock check'}
                      </div>
                    </div>
                    <Link href={productPath(topProduct.categorySlug, topProduct.slug)} className="btn">
                      <span>View Specs</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
