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
          <div className="min-h-screen bg-admin-bg font-admin tracking-[-0.011em] text-admin-fg antialiased">
            <header className="sticky top-0 z-40 w-full border-b border-admin-border bg-admin-surface/85 backdrop-blur-md transition-colors">
              <div className="mx-auto flex h-[58px] max-w-[1400px] items-center justify-between px-4 sm:px-6">
                <Link href="/admin" className="flex items-center gap-2.5 font-semibold text-admin-fg tracking-tight hover:opacity-90 transition-opacity">
                  <Shield size={19} className="text-admin-accent" />
                  <span className="font-bold text-base tracking-tight">SpecPulse</span>
                </Link>

                <Suspense fallback={null}>
                  <AdminNav reviewCount={reviewCount} />
                </Suspense>

                <UserMenu />
              </div>
            </header>

            <main className="mx-auto max-w-[1400px] min-h-[calc(100vh-58px)] px-4 py-6 sm:px-6">
              {children}
            </main>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </AdminThemeRoot>
  );
}
