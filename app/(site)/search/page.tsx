import Link from 'next/link';
import type { Metadata } from 'next';
import { Fragment } from 'react/jsx-runtime';
import { listCategories, searchSite } from '@/lib/catalog';
import { ArticleCard, CategoryTile, ComparisonCard, EmptyState, ProductCard, RoundupCard, SearchForm, SectionHeader } from '@/components/site';

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const q = (await searchParams).q ?? '';
  const [results, categories] = await Promise.all([searchSite(q), listCategories()]);
  const total = results ? results.products.length + results.articles.length + results.comparisons.length + results.roundups.length + results.categories.length : 0;

  return (
    <Fragment>
      <header className="search-head">
        <h1>{results ? <>Results for “{results.q}”</> : 'Search'}</h1>
        {results && <p className="muted">{total} {total === 1 ? 'result' : 'results'}</p>}
        <SearchForm size="lg" defaultValue={q} autoFocus={!results} />
      </header>

      {!results ? (
        <section>
          <SectionHeader title="Browse by category" />
          <div className="category-grid">
            {categories.map((c) => <CategoryTile key={c.slug} c={c} />)}
          </div>
        </section>
      ) : total === 0 ? (
        <EmptyState title="Nothing matched your search">
          Try a brand, a model name or a category, or <Link href="/#categories">browse by category</Link>.
        </EmptyState>
      ) : (
        <Fragment>
          {results.categories.length > 0 && (
            <section>
              <SectionHeader title="Categories" />
              <div className="category-grid">
                {categories.filter((c) => results.categories.some((r) => r.slug === c.slug)).map((c) => <CategoryTile key={c.slug} c={c} />)}
              </div>
            </section>
          )}
          {results.products.length > 0 && (
            <section>
              <SectionHeader title={`Products (${results.products.length})`} />
              <div className="product-grid">{results.products.map((p) => <ProductCard key={p.slug} p={p} />)} </div>
            </section>
          )}
          {results.comparisons.length > 0 && (
            <section>
              <SectionHeader title={`Comparisons (${results.comparisons.length})`} />
              <div className="compare-grid">{results.comparisons.map((c) => <ComparisonCard key={c.slug} c={c} />)} </div>
            </section>
          )}
          {results.roundups.length > 0 && (
            <section>
              <SectionHeader title={`Best picks (${results.roundups.length})`} />
              <div className="roundup-grid">{results.roundups.map((r) => <RoundupCard key={r.slug} r={r} />)} </div>
            </section>
          )}
          {results.articles.length > 0 && (
            <section>
              <SectionHeader title={`Guides (${results.articles.length})`} />
              <div className="article-grid">{results.articles.map((a) => <ArticleCard key={a.slug} a={a} />)} </div>
            </section>
          )}
        </Fragment>
      )}
    </Fragment>
  );
}
