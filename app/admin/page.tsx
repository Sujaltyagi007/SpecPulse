import { Suspense } from 'react';
import { AdminDashboardClient } from './components/admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardClient />
    </Suspense>
  );
}
