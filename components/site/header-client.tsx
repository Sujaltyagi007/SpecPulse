'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import type { CategoryItem } from '@/lib/catalog';
import { NAV_LINKS } from '@/lib/site';
import { CategoryIcon } from './category-icon';
import { SearchForm } from './ui';
import { THEME_KEY } from './theme';

type Theme = 'system' | 'light' | 'dark';
const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === 'light' || t === 'dark') setTheme(t);
  }, []);

  function cycle() {
    const next = NEXT_THEME[theme];
    setTheme(next);
    if (next === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <button type="button" className="icon-btn" onClick={cycle} aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}`} title={`Theme: ${theme}`}>
      <Icon size={18} />
    </button>
  );
}

function useCloseOnNavigate(close: () => void) {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    close();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function CategoriesMenu({ categories }: { categories: CategoryItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnNavigate(() => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="nav-link" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        Categories <ChevronDown size={14} className="dropdown-caret" aria-hidden />
      </button>
      {open && (
        <div className="dropdown-panel" role="menu">
          <div className="dropdown-grid">
            {categories.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="dropdown-item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="dropdown-icon"><CategoryIcon slug={c.slug} size={18} /></span>
                <span>
                  <b>{c.name}</b>
                  <small>{c.productCount ? `${c.productCount} products` : 'Coming soon'}</small>
                </span>
              </Link>
            ))}
          </div>
          <Link href="/#categories" className="dropdown-footer" onClick={() => setOpen(false)}>
            <LayoutGrid size={15} aria-hidden /> Browse all categories
          </Link>
        </div>
      )}
    </div>
  );
}

export function MobileMenu({ categories }: { categories: CategoryItem[] }) {
  const [open, setOpen] = useState(false);
  useCloseOnNavigate(() => setOpen(false));

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="icon-btn mobile-only" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="mobile-menu">
          <SearchForm />
          <p className="mobile-menu-label">Categories</p>
          <div className="mobile-menu-cats">
            {categories.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="mobile-menu-cat" onClick={() => setOpen(false)}>
                <CategoryIcon slug={c.slug} size={18} />
                {c.name}
              </Link>
            ))}
          </div>
          <p className="mobile-menu-label">Explore</p>
          <nav className="mobile-menu-links">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={`nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}
