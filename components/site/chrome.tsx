import Link from 'next/link';
import { ArrowUp, Search, ShieldCheck } from 'lucide-react';
import type { CategoryItem } from '@/lib/catalog';
import { NAV_LINKS, SITE_NAME } from '@/lib/site';
import { CategoriesMenu, MobileMenu, NavLink, ThemeToggle } from './header-client';
import { Logo } from './logo';

export function SiteHeader({ categories }: { categories: CategoryItem[] }) {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Logo id="logo-header" />
        <nav className="site-nav desktop-only" aria-label="Main">
          <CategoriesMenu categories={categories} />
          {NAV_LINKS.map((l) => (<NavLink key={l.href} href={l.href}>{l.label}</NavLink>))}
        </nav>
        <div className="site-header-actions">
          <form action="/search" method="get" role="search" className="header-search desktop-only">
            <Search size={15} aria-hidden />
            <input type="search" name="q" placeholder="Search…" className="outline-none" aria-label="Search SpecPulse" minLength={2} required />
          </form>
          <Link href="/search" className="icon-btn mobile-only" aria-label="Search">
            <Search size={18} />
          </Link>
          <ThemeToggle />
          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ categories }: { categories: CategoryItem[] }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <Logo id="logo-footer" />
            <p className="site-footer-tagline">Verified tech specs and daily-checked prices.</p>
          </div>
          <div>
            <h4>Categories</h4>
            <ul>
              {categories.slice(0, 6).map((c) => (
                <li key={c.slug}><Link href={`/${c.slug}`}>{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
              <li><Link href="/search">Search</Link></li>
            </ul>
          </div>
          <div className="site-footer-note">
            <h4><ShieldCheck size={14} aria-hidden /> How we work</h4>
            <p>Specs are checked by a person against manufacturer sources. Prices are refreshed daily and may have changed. We earn a commission from some retailer links at no cost to you.</p>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span>
          <a href="#content" className="site-footer-top">Back to top <ArrowUp size={14} aria-hidden /></a>
        </div>
      </div>
    </footer>
  );
}
