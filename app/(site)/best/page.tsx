import type { Metadata } from 'next';
import { Trophy } from 'lucide-react';
import { Fragment } from 'react/jsx-runtime';
import { listRoundupCards } from '@/lib/catalog';
import { Breadcrumb, EmptyState, PageHeader, RoundupCard } from '@/components/site';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Best picks',
  description: 'Ranked shortlists of the best products for common needs, with verified specs and daily prices.',
  alternates: { canonical: '/best' },
};

export default async function BestIndex() {
  const roundups = await listRoundupCards();
  return (
    <Fragment>
      <Breadcrumb items={[{ label: 'Best picks' }]} />
      <PageHeader icon={<Trophy size={26} strokeWidth={1.75} />} title="Best picks" lead="Ranked shortlists for common needs, chosen by our editors from verified specs." />
      {roundups.length === 0 ? (
        <EmptyState title="No best-of lists yet">Lists are published once every pick has verified specs.</EmptyState>
      ) : (
        <div className="roundup-grid">
          {roundups.map((r) => <RoundupCard key={r.slug} r={r} />)}
        </div>
      )}
    </Fragment>
  );
}
