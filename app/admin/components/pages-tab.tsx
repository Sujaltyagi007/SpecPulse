'use client';
import { ContentTab } from './content-tab';
import { ArticlesTab } from './articles-tab';
import { RoundupsTab } from './roundups-tab';
import { ComparisonsTab } from './comparisons-tab';
import { softSpring } from '@/components/admin/motion';
import { AnimatePresence, motion } from 'motion/react';
import { Segmented } from '@/components/admin/segmented';
import { Award, FileText, GitCompare, Newspaper } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type PagesView = 'articles' | 'comparisons' | 'roundups' | 'copy';

export function PagesTab({ initialView }: { initialView: PagesView }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (params.get('view') as PagesView | null) ?? initialView;

  const setView = (v: PagesView) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'pages');
    next.set('view', v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Segmented<PagesView>
        ariaLabel="Page type"
        value={view}
        onChange={setView}
        options={[
          { value: 'articles', label: 'Articles', icon: <Newspaper size={14} /> },
          { value: 'comparisons', label: 'Comparisons', icon: <GitCompare size={14} /> },
          { value: 'roundups', label: 'Best-of lists', icon: <Award size={14} /> },
          { value: 'copy', label: 'Page copy', icon: <FileText size={14} /> },
        ]}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24, transition: { duration: 0.12 } }}
          transition={softSpring}
        >
          {view === 'articles' && <ArticlesTab />}
          {view === 'comparisons' && <ComparisonsTab />}
          {view === 'roundups' && <RoundupsTab />}
          {view === 'copy' && <ContentTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
