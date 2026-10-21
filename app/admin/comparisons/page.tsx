import { Suspense } from 'react';
import { AdminDashboardClient } from '../components/admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default function ComparisonsAdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardClient defaultTab="pages" defaultView="comparisons" />
    </Suspense>
  );
}
