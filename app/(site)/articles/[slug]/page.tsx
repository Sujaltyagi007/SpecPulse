import Link from 'next/link';
import type { Metadata } from 'next';
import { Faq } from '@/components/copy';
import { notFound } from 'next/navigation';
import { Fragment } from 'react/jsx-runtime';
import { Breadcrumb } from '@/components/site';
import { ArticleBody } from '@/lib/articles/markdown';
import { faqJsonLd, jsonLdString } from '@/lib/jsonld';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { formatDate, productPath, SITE_NAME, SITE_URL } from '@/lib/site';
import { getPublishedArticle, listPublishedArticles } from '@/lib/articles/queries';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listPublishedArticles()).map((a) => ({ slug: a.slug }));
}

const coverUrl = (slug: string, updatedAt: Date) => `/articles/${slug}/cover?v=${updatedAt.getTime()}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getPublishedArticle((await params).slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: { type: 'article', title: a.title, description: a.summary, ...(a.hasImage && { images: [coverUrl(a.slug, a.updatedAt)] }) },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await getPublishedArticle((await params).slug);
  if (!a) notFound();

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.summary,
    datePublished: a.publishedAt.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    mainEntityOfPage: `${SITE_URL}/articles/${a.slug}`,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    ...(a.hasImage && { image: SITE_URL + coverUrl(a.slug, a.updatedAt) }),
    ...(a.sources.length && { citation: a.sources.map((s) => s.url) }),
  };
  const faq = faqJsonLd(a);

  return (
    <article className="article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(articleLd) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faq) }} />}

      <Breadcrumb items={[{ label: 'Guides', href: '/articles' }]} />
      <h1>{a.title}</h1>
      <p className="article-meta">
        <CalendarDays size={14} aria-hidden /> Published {formatDate(a.publishedAt)}
        {a.updatedAt.getTime() - a.publishedAt.getTime() > 86_400_000 && ` · Updated ${formatDate(a.updatedAt)}`}
      </p>
      {a.hasImage && (<img className="article-cover" src={coverUrl(a.slug, a.updatedAt)} alt={a.imageAlt} width={1200} height={630} />)}
      <p className="lead">{a.summary}</p>
      <div className="article-body">
        <ArticleBody markdown={a.bodyMd} sourceCount={a.sources.length} />
      </div>

      {a.products.length > 0 && (
        <Fragment>
          <h2>Products in this guide</h2>
          <div className="mini-grid">
            {a.products.map((p) => (
              <Link key={p.slug} href={productPath(p.category.slug, p.slug)} className="mini-card">
                <div>
                  <small>{p.category.name}</small>
                  <b>{p.title}</b>
                </div>
                <ChevronRight size={16} aria-hidden />
              </Link>
            ))}
          </div>
        </Fragment>
      )}

      <Faq items={a.faq} />

      {a.sources.length > 0 && (
        <Fragment>
          <h2>Sources</h2>
          <ol className="article-sources">
            {a.sources.map((s, i) => (
              <li key={s.url} id={`source-${i + 1}`}>
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title || s.url}</a>
              </li>
            ))}
          </ol>
        </Fragment>
      )}

      <p className="muted article-note">
        This guide was researched and drafted with AI from the sources above and SpecPulse&apos;s verified specs, then checked and
        edited by a person before publishing. SpecPulse does not test products hands-on.
      </p>
    </article>
  );
}
