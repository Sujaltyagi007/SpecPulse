import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Fragment } from 'react/jsx-runtime';
import { listPublishedProducts } from '@/lib/products';
import { getCategory, listComparisonCards, listRoundupCards, sortProducts, SORTS, type SortKey } from '@/lib/catalog';
import { Breadcrumb, CategoryIcon, ComparisonCard, EmptyState, PageHeader, ProductCard, RoundupCard, SectionHeader, } from '@/components/site';

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string; brand?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).category);
  if (!c) return {};
  return {
    title: `${c.name}: verified specs and prices`,
    description: `Compare ${c.name.toLowerCase()} by verified specs and today's lowest prices.`,
    alternates: { canonical: `/${c.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  const c = await getCategory(category);
  if (!c) notFound();

  const sort: SortKey = query.sort && query.sort in SORTS ? (query.sort as SortKey) : 'popular';
  const [all, comparisons, roundups] = await Promise.all([
    listPublishedProducts({ categorySlug: c.slug }),
    listComparisonCards({ categorySlug: c.slug, take: 4 }),
    listRoundupCards({ categorySlug: c.slug, take: 3 }),
  ]);
  const brands = [...new Set(all.map((p) => p.brand))].sort();
  const brand = query.brand && brands.includes(query.brand) ? query.brand : null;
  const products = sortProducts(brand ? all.filter((p) => p.brand === brand) : all, sort);

  const href = (next: { sort?: SortKey; brand?: string | null }) => {
    const s = new URLSearchParams();
    const nextSort = next.sort ?? sort;
    const nextBrand = next.brand === undefined ? brand : next.brand;
    if (nextSort !== 'popular') s.set('sort', nextSort);
    if (nextBrand) s.set('brand', nextBrand);
    const qs = s.toString();
    return `/${c.slug}${qs ? `?${qs}` : ''}`;
  };

  return (
    <Fragment>
      <Breadcrumb items={[{ label: c.name }]} />
      <PageHeader icon={<CategoryIcon slug={c.slug} size={26} />} title={c.name} lead={`${all.length} ${all.length === 1 ? 'product' : 'products'} with specs verified by a person and prices checked daily.`} />
      {all.length > 0 && (
        <div className="toolbar">
          {brands.length > 1 && (
            <div className="filter-pills" aria-label="Filter by brand">
              <Link href={href({ brand: null })} className={`pill${brand ? '' : ' is-active'}`} scroll={false}>All brands</Link>
              {brands.map((b) => (
                <Link key={b} href={href({ brand: b })} className={`pill${brand === b ? ' is-active' : ''}`} scroll={false}>{b}</Link>
              ))}
            </div>
          )}
          <div className="sort-links" aria-label="Sort products">
            <span>Sort:</span>
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <Link key={k} href={href({ sort: k })} className={sort === k ? 'is-active' : undefined} scroll={false}>{SORTS[k]}</Link>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState title={`No ${c.name.toLowerCase()} yet`}>
          We publish a product once every spec has been checked by a person. <Link href="/">Back to home</Link>
        </EmptyState>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      )}

      {roundups.length > 0 && (
        <section>
          <SectionHeader title={`Best ${c.name.toLowerCase()}`} sub="Ranked shortlists by our editors." />
          <div className="roundup-grid">
            {roundups.map((r) => <RoundupCard key={r.slug} r={r} />)}
          </div>
        </section>
      )}

      {comparisons.length > 0 && (
        <section>
          <SectionHeader title="Popular comparisons" href="/compare" linkLabel="All comparisons" />
          <div className="compare-grid">
            {comparisons.map((cmp) => <ComparisonCard key={cmp.slug} c={cmp} />)}
          </div>
        </section>
      )}
    </Fragment>
  );
}
