import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminLoginForm } from './login-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In - SpecPulse Admin',
  description: 'Sign in to the SpecPulse Admin Console.',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-admin-bg">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-admin-muted">
            <Loader2 size={24} className="animate-spin text-admin-muted" />
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
