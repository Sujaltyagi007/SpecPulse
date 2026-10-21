import './admin.css';
import Link from 'next/link';
import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { currentProfile } from '@/lib/admin-user';
import { AdminNav } from '@/components/admin/admin-nav';
import { UserMenu } from '@/components/admin/user-menu';
import { ToastProvider } from '@/components/admin/toast';
import { AdminThemeRoot } from '@/components/admin/theme-root';
import { ConfirmProvider } from '@/components/admin/alert-dialog';

export const metadata: Metadata = {
  title: 'Admin Console - SpecPulse',
  robots: { index: false, follow: false },
};

export const maxDuration = 300;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [profile, reviewCount] = await Promise.all([
    currentProfile(),
    prisma.product.count({ where: { status: 'review' } }),
  ]);
  const { theme, ...identity } = profile;

  return (
    <AdminThemeRoot initialTheme={theme} identity={identity}>
      <ToastProvider>
        <ConfirmProvider>
          <div className="admin-shell">
            <header className="admin-header">
              <div className="admin-container admin-header-inner">
                <Link href="/admin" className="admin-brand">
                  <Shield size={19} style={{ color: 'var(--admin-accent)' }} />
                  <span>SpecPulse</span>
                </Link>

                <Suspense fallback={null}>
                  <AdminNav reviewCount={reviewCount} />
                </Suspense>

                <UserMenu />
              </div>
            </header>

            <main className="admin-container" style={{ minHeight: 'calc(100vh - 58px)' }}>
              {children}
            </main>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </AdminThemeRoot>
  );
}
