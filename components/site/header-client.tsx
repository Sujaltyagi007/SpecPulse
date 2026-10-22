'use client';
import Link from 'next/link';
import { SearchForm } from './ui';
import { THEME_KEY } from './theme';
import { flushSync } from 'react-dom';
import { NAV_LINKS } from '@/lib/site';
import { usePathname } from 'next/navigation';
import { CategoryIcon } from './category-icon';
import type { CategoryItem } from '@/lib/catalog';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, Menu, Moon, Sun, X } from 'lucide-react';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const isDark =
      document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const activeTheme: Theme = isDark ? 'dark' : 'light';
    setTheme(activeTheme);
    if (!document.documentElement.dataset.theme) {
      document.documentElement.dataset.theme = activeTheme;
    }
  }, []);

  const toggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isTransitioningRef.current) return;

    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const applyTheme = (t: Theme) => {
      setTheme(t);
      document.documentElement.dataset.theme = t;
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch { }
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      applyTheme(next);
      return;
    }

    if (typeof document.startViewTransition === 'function') {
      isTransitioningRef.current = true;
      try {
        const transition = document.startViewTransition(() => {
          flushSync(() => { applyTheme(next) });
        });

        await transition.ready;

        const animation = document.documentElement.animate({
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        }, {
          duration: 520,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        });

        await animation.finished;
      }
      catch { applyTheme(next) }
      finally { isTransitioningRef.current = false }
      return;
    }

    isTransitioningRef.current = true;
    const overlay = document.createElement('div');
    const targetBg = next === 'dark' ? '#000000' : '#ffffff';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.pointerEvents = 'none';
    overlay.style.backgroundColor = targetBg;
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    overlay.style.transition = 'clip-path 500ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 150ms ease';
    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.style.clipPath = `circle(${endRadius}px at ${x}px ${y}px)`;

    setTimeout(() => {
      applyTheme(next);
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        isTransitioningRef.current = false;
      }, 150);
    }, 420);
  };

  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className="icon-btn theme-toggle-btn" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <span className="theme-toggle-icon" style={{
        transform: theme === 'dark' ? 'rotate(360deg)' : 'rotate(0deg)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </span>
    </button>
  );
}

function useCloseOnNavigate(close: () => void) {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    close();
  }, [pathname]);
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
    <Fragment>
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
    </Fragment>
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
