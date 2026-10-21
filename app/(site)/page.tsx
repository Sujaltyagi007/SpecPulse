import { Fragment } from 'react/jsx-runtime';
import { listPublishedProducts } from '@/lib/products';
import { BadgeCheck, LineChart, Scale } from 'lucide-react';
import { listPublishedArticles } from '@/lib/articles/queries';
import { getSiteStats, listCategories, listComparisonCards, listRoundupCards, sortProducts } from '@/lib/catalog';
import { ArticleCard, CategoryTile, ComparisonCard, EmptyState, ProductCard, RoundupCard, SectionHeader, TrendingHeroBanner } from '@/components/site';

export const revalidate = 3600;

const STEPS = [
  { icon: BadgeCheck, title: 'Specs verified by a person', text: 'Every spec is checked against manufacturer sources before a page goes live.' },
  { icon: LineChart, title: 'Prices tracked daily', text: 'We re-check retailer prices every morning and keep the price history.' },
  { icon: Scale, title: 'Compare side by side', text: 'Put two products head to head or read our ranked picks for your use.' },
];

export default async function HomePage() {
  const [products, categories, comparisons, roundups, articles, stats] = await Promise.all([
    listPublishedProducts(),
    listCategories(),
    listComparisonCards({ take: 4 }),
    listRoundupCards({ take: 3 }),
    listPublishedArticles(3),
    getSiteStats(),
  ]);
  const latest = sortProducts(products, 'newest').slice(0, 8);

  return (
    <Fragment>
      <TrendingHeroBanner latestProducts={latest} featuredArticle={articles[0]} categories={categories} stats={stats} />
      {categories.length > 0 && (
        <section id="categories" className="anchor-section">
          <SectionHeader title="Browse by category" sub="Explore verified specs and curated picks across consumer tech." />
          <div className="category-grid">
            {categories.map((c) => <CategoryTile key={c.slug} c={c} />)}
          </div>
        </section>
      )}
      <section id="best" className="anchor-section">
        <SectionHeader title="The Best in Tech" sub="Ranked shortlists and expert recommendations for common needs and budgets." href="/best" linkLabel="All best picks" />
        {roundups.length === 0 ? (
          <EmptyState title="No best-of lists published yet">
            Ranked shortlists will appear here as soon as picks are verified by our editors.
          </EmptyState>
        ) : (
          <div className="roundup-grid">
            {roundups.map((r) => <RoundupCard key={r.slug} r={r} />)}
          </div>
        )}
      </section>

      <section id="latest">
        <SectionHeader title="Latest products" sub="Recently verified specifications with today's lowest retailer price." />
        {latest.length === 0 ? (
          <EmptyState title="No products yet">
            New products appear here as soon as their specs are verified.
          </EmptyState>
        ) : (
          <div className="product-grid">
            {latest.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        )}
      </section>

      {comparisons.length > 0 && (
        <section id="compare">
          <SectionHeader title="Popular comparisons" sub="Two products, every verified spec, side by side." href="/compare" linkLabel="All comparisons" />
          <div className="compare-grid">
            {comparisons.map((c) => <ComparisonCard key={c.slug} c={c} />)}
          </div>
        </section>
      )}

      <section id="how-it-works">
        <SectionHeader title="How SpecPulse works" />
        <ol className="steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-icon">
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <b>{title}</b>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {articles.length > 0 && (
        <section id="guides">
          <SectionHeader title="Latest guides" sub="Buying guides and explainers, checked by a person." href="/articles" linkLabel="All guides" />
          <div className="article-grid">
            {articles.map((a) => <ArticleCard key={a.slug} a={a} />)}
          </div>
        </section>
      )}
    </Fragment>
  );
}
