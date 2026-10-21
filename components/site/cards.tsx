import Link from 'next/link';
import { ArrowUpRight, BookOpen, Trophy } from 'lucide-react';
import { formatDate, formatPrice, productPath } from '@/lib/site';
import type { CategoryItem, ComparisonCardData, ProductListItem, RoundupCardData } from '@/lib/catalog';
import { CategoryIcon } from './category-icon';

function Thumb({ src, fallback, small }: { src: string | null; fallback: string; small?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- merchant images on arbitrary hosts
    <img src={src} alt="" loading="lazy" />
  ) : (
    <span className={`monogram${small ? ' monogram-sm' : ''}`} aria-hidden>
      {fallback.charAt(0).toUpperCase()}
    </span>
  );
}

export function ProductCard({ p }: { p: ProductListItem }) {
  return (
    <Link href={productPath(p.categorySlug, p.slug)} className="card product-card">
      <div className="card-media">
        <Thumb src={p.imageUrl} fallback={p.brand ?? p.title} />
      </div>
      <div className="card-body">
        <span className="card-kicker">{p.brand} · {p.categoryName}</span>
        <div className="card-title">{p.title}</div>
        <div className="card-foot">
          {p.bestPrice ? (
            <div>
              <span className="price-label">Lowest today</span>
              <span className="price">{formatPrice(p.bestPrice.cents, p.bestPrice.currency)}</span>
            </div>
          ) : (
            <span className="price-none">Check current price</span>
          )}
          <span className="card-arrow" aria-hidden>
            <ArrowUpRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

type ArticleCardData = {
  slug: string;
  title: string | null;
  summary?: string | null;
  heroImageType: string | null;
  heroImageAlt: string | null;
  publishedAt?: Date | null;
  updatedAt: Date;
};

export function ArticleCard({ a }: { a: ArticleCardData }) {
  return (
    <Link href={`/articles/${a.slug}`} className="card article-card">
      <div className="card-media card-media-wide">
        {a.heroImageType ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own cached route
          <img src={`/articles/${a.slug}/cover?v=${a.updatedAt.getTime()}`} alt={a.heroImageAlt ?? ''} loading="lazy" />
        ) : (
          <span className="media-placeholder" aria-hidden>
            <BookOpen size={32} strokeWidth={1.5} />
          </span>
        )}
      </div>
      <div className="card-body">
        <span className="card-kicker">Guide{a.publishedAt ? ` · ${formatDate(a.publishedAt)}` : ''}</span>
        <div className="card-title">{a.title}</div>
        {a.summary && <p className="card-text">{a.summary}</p>}
      </div>
    </Link>
  );
}

export function CategoryTile({ c }: { c: CategoryItem }) {
  return (
    <Link href={`/${c.slug}`} className="category-tile">
      <span className="category-tile-icon">
        <CategoryIcon slug={c.slug} size={22} />
      </span>
      <span className="category-tile-name">{c.name}</span>
      <span className="category-tile-count">{c.productCount ? `${c.productCount} products` : 'Coming soon'}</span>
    </Link>
  );
}

export function ComparisonCard({ c }: { c: ComparisonCardData }) {
  return (
    <Link href={`/compare/${c.slug}`} className="card compare-card">
      <div className="compare-card-sides">
        <div className="compare-card-side">
          <span className="compare-card-thumb"><Thumb src={c.a.imageUrl} fallback={c.a.brand} small /></span>
          <b>{c.a.title}</b>
        </div>
        <span className="vs-badge" aria-hidden>VS</span>
        <div className="compare-card-side">
          <span className="compare-card-thumb"><Thumb src={c.b.imageUrl} fallback={c.b.brand} small /></span>
          <b>{c.b.title}</b>
        </div>
      </div>
      <span className="card-kicker compare-card-foot">
        {c.category} · Spec comparison <ArrowUpRight size={14} aria-hidden />
      </span>
    </Link>
  );
}

export function RoundupCard({ r }: { r: RoundupCardData }) {
  return (
    <Link href={`/best/${r.slug}`} className="card roundup-card">
      <span className="roundup-card-icon" aria-hidden>
        <Trophy size={20} strokeWidth={1.75} />
      </span>
      <div className="card-body">
        <span className="card-kicker">{r.category} · {r.picks} picks</span>
        <div className="card-title">{r.title}</div>
        {r.useCase && <p className="card-text">{r.useCase}</p>}
      </div>
    </Link>
  );
}
