import Link from 'next/link';
import type { Metadata } from 'next';
import { productPath } from '@/lib/site';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/site';
import { faqJsonLd, jsonLdString } from '@/lib/jsonld';
import { BestPrice, Disclosure, Faq, Prose, Updated } from '@/components/copy';
import { getComparisonPage, listPublishedComparisons, specRows } from '@/lib/pages';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listPublishedComparisons()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getComparisonPage((await params).slug);
  if (!page) return {};
  return {
    title: `${page.a.title} vs ${page.b.title}: spec comparison`,
    description: page.summary ?? undefined,
    alternates: { canonical: `/compare/${page.slug}` },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const page = await getComparisonPage((await params).slug);
  if (!page) notFound();
  const { a, b } = page;
  const faq = faqJsonLd(page);

  return (
    <article>
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faq) }} />}

      <Breadcrumb items={[{ label: 'Compare', href: '/compare' }, { label: a.category.name, href: `/${a.category.slug}` }]} />
      <header className="page-head">
        <span className="chip">Comparison</span>
        <h1>
          {a.title} vs {b.title}
        </h1>
        <p className="lead">{page.summary ?? `Verified specs and today's prices for the ${a.title} and ${b.title}, side by side.`}</p>
        <Disclosure />
      </header>

      <div className="compare-heads">
        <Link href={productPath(a.category.slug, a.slug)} className="compare-head">
          <span>{a.brand}</span>
          {a.title}
        </Link>
        <span className="vs-badge" aria-hidden>VS</span>
        <Link href={productPath(b.category.slug, b.slug)} className="compare-head">
          <span>{b.brand}</span>
          {b.title}
        </Link>
      </div>

      <h2>Specs side by side</h2>
      <div className="panel">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Spec</th>
              <th>
                <Link href={productPath(a.category.slug, a.slug)}>{a.title}</Link>
              </th>
              <th>
                <Link href={productPath(b.category.slug, b.slug)}>{b.title}</Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {specRows(a, b).map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.a ? `${r.a}${r.unit ? ` ${r.unit}` : ''}` : <span className="muted">Not listed</span>}</td>
                <td>{r.b ? `${r.b}${r.unit ? ` ${r.unit}` : ''}` : <span className="muted">Not listed</span>}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Lowest price today</th>
              <td>
                <BestPrice product={a} />
              </td>
              <td>
                <BestPrice product={b} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {page.bodyMd && <h2>Which should you get?</h2>}
      <Prose text={page.bodyMd} />
      <Faq items={page.faq} />
      <Updated date={page.updatedAt} />
    </article>
  );
}
