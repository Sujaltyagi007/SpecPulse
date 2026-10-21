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
    <nav className="admin-tabs-list admin-primary-nav" aria-label="Admin sections">
      {ITEMS.map((item) => {
        const isActive = item.section === active;
        return (
          <Link key={item.section} href={item.href} className={`admin-tab-trigger ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined}>
            {isActive && <motion.span layoutId="admin-nav-pill" className="admin-tab-pill" transition={spring} />}
            <span style={{ display: 'inline-flex' }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.section === 'products' && reviewCount > 0 && (
              <motion.span key={reviewCount} className="admin-tab-badge"
                initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 16 }}
              >
                {reviewCount}
              </motion.span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
