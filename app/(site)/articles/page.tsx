import type { Metadata } from 'next';
import { Fragment } from 'react/jsx-runtime';
import { ArticleCard, Breadcrumb } from '@/components/site';
import { listPublishedArticles } from '@/lib/articles/queries';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Guides',
  description: 'Buying guides and explainers, researched from cited sources and checked by a person.',
  alternates: { canonical: '/articles' },
};

export default async function ArticlesIndex() {
  const articles = await listPublishedArticles();
  return (
    <Fragment>
      <Breadcrumb items={[{ label: 'Guides' }]} />
      <header className="page-head">
        <h1>Guides</h1>
        <p className="lead">Buying guides and explainers, researched from cited sources and checked by a person.</p>
      </header>
      <div style={{ marginTop: 32 }}>
        {articles.length === 0 ? (
          <p className="empty">No guides yet.</p>
        ) : (
          <div className="article-grid">
            {articles.map((a) => (
              <ArticleCard key={a.slug} a={a} />
            ))}
          </div>
        )}
      </div>
    </Fragment>
  );
}
