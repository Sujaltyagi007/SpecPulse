'use client';
import { useEffect, useState } from 'react';
import { HomeTab } from './home-tab';
import { ProductsTab } from './products-tab';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PagesTab, type PagesView } from './pages-tab';
import { AnimatePresence, motion } from 'motion/react';
import { softSpring } from '@/components/admin/motion';
import { useToast } from '@/components/admin/toast';
import { markAllTabsDirty } from '@/lib/admin-cache';

export type DashboardSection = 'home' | 'products' | 'pages';

export function AdminDashboardClient({
  defaultTab = 'home',
  defaultView = 'articles',
}: {
  defaultTab?: DashboardSection;
  defaultView?: PagesView;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const tab = (params.get('tab') as DashboardSection | null) ?? defaultTab;

  // Arriving from another page (an editor, after a delete, approve, publish...) means the
  // cached tab data may be out of date. Mark it stale before the tabs read it on first render.
  // Switching tabs inside the dashboard doesn't remount this, so the cache still helps there.
  useState(() => markAllTabsDirty());

  // A delete redirects here with ?deleted=<title>: confirm it, then drop the param.
  const deleted = params.get('deleted');
  useEffect(() => {
    if (!deleted) return;
    toast.success('Product deleted', `${deleted} and its pages were removed.`);
    const next = new URLSearchParams(params);
    next.delete('deleted');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per deletion
  }, [deleted]);

  return (
    <div className="pb-12">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.12 } }}
          transition={softSpring}
          className={tab === 'home' ? 'pt-0' : 'pt-6'}
        >
          {tab === 'products' && <ProductsTab />}
          {tab === 'pages' && <PagesTab initialView={defaultView} />}
          {tab !== 'products' && tab !== 'pages' && <HomeTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
