import Link from 'next/link';
import { ArrowRight, ChevronRight, Search } from 'lucide-react';
import { Fragment } from 'react/jsx-runtime';

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map((item) => (
        <Fragment key={item.label}>
          <ChevronRight size={14} aria-hidden />
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  icon,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className={icon ? 'page-head has-icon' : 'page-head'}>
      {icon && <span className="page-head-icon">{icon}</span>}
      <div>
        {eyebrow && <span className="chip">{eyebrow}</span>}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </header>
  );
}

export function SectionHeader({ title, sub, href, linkLabel }: { title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="section-link">
          {linkLabel ?? 'View all'} <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}

export function SearchForm({ defaultValue, size = 'md', autoFocus }: { defaultValue?: string; size?: 'md' | 'lg'; autoFocus?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className={`search-form search-${size}`}>
      <Search size={size === 'lg' ? 20 : 16} aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search products, comparisons, guides…"
        aria-label="Search SpecPulse"
        autoComplete="off"
        autoFocus={autoFocus}
        minLength={2}
        required
      />
      {size === 'lg' && <button type="submit" className="btn">Search</button>}
    </form>
  );
}
