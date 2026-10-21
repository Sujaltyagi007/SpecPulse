import type { Metadata } from 'next';
import { Scale } from 'lucide-react';
import { Fragment } from 'react/jsx-runtime';
import { listComparisonCards } from '@/lib/catalog';
import { Breadcrumb, ComparisonCard, EmptyState, PageHeader } from '@/components/site';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Compare',
  description: 'Head-to-head spec comparisons with verified specs and today’s prices.',
  alternates: { canonical: '/compare' },
};

export default async function CompareIndex() {
  const comparisons = await listComparisonCards();
  return (
    <Fragment>
      <Breadcrumb items={[{ label: 'Compare' }]} />
      <PageHeader icon={<Scale size={26} strokeWidth={1.75} />} title="Compare" lead="Two products, every verified spec and today’s lowest price, side by side." />
      {comparisons.length === 0 ? (
        <EmptyState title="No comparisons yet">Comparisons are published once both products have verified specs.</EmptyState>
      ) : (
        <div className="compare-grid">
          {comparisons.map((c) => <ComparisonCard key={c.slug} c={c} />)}
        </div>
      )}
    </Fragment>
  );
}
