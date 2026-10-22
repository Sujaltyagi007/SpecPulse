import Link from 'next/link';
import type { Metadata } from 'next';
import { productPath } from '@/lib/site';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/site';
import { getRoundupPage, listPublishedRoundups } from '@/lib/pages';
import { faqJsonLd, itemListJsonLd, jsonLdString } from '@/lib/jsonld';
import { BestPrice, Disclosure, Faq, Prose, Updated } from '@/components/copy';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listPublishedRoundups()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getRoundupPage((await params).slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.summary ?? undefined,
    alternates: { canonical: `/best/${page.slug}` },
  };
}

export default async function RoundupPage({ params }: Props) {
  const page = await getRoundupPage((await params).slug);
  if (!page) notFound();
  const faq = faqJsonLd(page);
  const list = itemListJsonLd(page.title, page.picks.map((p) => p.product));

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(list) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faq) }} />}

      <Breadcrumb items={[{ label: 'Best picks', href: '/best' }, { label: page.category.name, href: `/${page.category.slug}` }]} />
      <header className="page-head">
        <span className="chip">Editors&apos; picks</span>
        <h1>{page.title}</h1>
        <p className="lead">{page.summary ?? `Our editors' picks, with verified specs and today's prices.`}</p>
        <Disclosure />
      </header>

      <h2>Our picks</h2>
      <ol className="pick-list">
        {page.picks.map(({ rank, label, product }) => (
          <li key={product.slug} className="pick">
            <span className="pick-rank" aria-label={`Rank ${rank}`}>{rank}</span>
            <div className="pick-body">
              {label && <span className="chip">{label}</span>}
              <Link href={productPath(product.category.slug, product.slug)} className="pick-title">{product.title}</Link>
              <div className="pick-specs">
                {product.specs.filter((s) => s.verified).slice(0, 4).map((s) => `${s.label}: ${s.value}${s.unit ? ` ${s.unit}` : ''}`).join(' · ')}
              </div>
            </div>
            <div className="pick-cta">
              <BestPrice product={product} />
            </div>
          </li>
        ))}
      </ol>
      {page.bodyMd && <h2>Why these picks</h2>}
      <Prose text={page.bodyMd} />
      <Faq items={page.faq} />
      <Updated date={page.updatedAt} />
    </article>
  );
}
