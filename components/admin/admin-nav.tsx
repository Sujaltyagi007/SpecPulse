'use client';
import Link from 'next/link';
import { spring } from './motion';
import { motion } from 'motion/react';
import { FileStack, House, Layers } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';

export type AdminSection = 'home' | 'products' | 'pages';

const ITEMS: { section: AdminSection; href: string; label: string; icon: React.ReactNode }[] = [
  { section: 'home', href: '/admin', label: 'Home', icon: <House size={15} /> },
  { section: 'products', href: '/admin?tab=products', label: 'Products', icon: <Layers size={15} /> },
  { section: 'pages', href: '/admin?tab=pages', label: 'Pages', icon: <FileStack size={15} /> },
];

export function sectionFor(pathname: string, tab: string | null): AdminSection | null {
  if (pathname === '/admin') return tab === 'products' || tab === 'pages' ? tab : 'home';
  if (pathname.startsWith('/admin/products')) return 'products';
  if (/^\/admin\/(comparisons|roundups|content|articles)/.test(pathname)) return 'pages';
  return null;
}

export function AdminNav({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();
  const tab = useSearchParams().get('tab');
  const active = sectionFor(pathname, tab);

  return (
    <nav className="admin-tabs-list admin-primary-nav relative flex items-center gap-1 rounded-admin bg-admin-muted-bg/70 p-1 border border-admin-border/50 text-sm font-medium" aria-label="Admin sections">
      {ITEMS.map((item) => {
        const isActive = item.section === active;
        return (
          <Link
            key={item.section}
            href={item.href}
            className={`admin-tab-trigger relative flex items-center gap-2 rounded-admin-sm px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive ? 'active text-admin-fg font-semibold' : 'text-admin-muted hover:text-admin-fg'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.span
                layoutId="admin-nav-pill"
                className="admin-tab-pill absolute inset-0 rounded-admin-sm bg-admin-surface shadow-admin-sm border border-admin-border/60"
                transition={spring}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span className="inline-flex">{item.icon}</span>
              <span>{item.label}</span>
              {item.section === 'products' && reviewCount > 0 && (
                <motion.span
                  key={reviewCount}
                  className="admin-tab-badge ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-admin-warn px-1 text-[10px] font-bold text-black"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 16 }}
                >
                  {reviewCount}
                </motion.span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
