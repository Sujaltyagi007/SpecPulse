'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Please enter your username');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          username: trimmedUser,
          password,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          if (result.error === 'CredentialsSignin') {
            setError('Invalid username or password');
          } else {
            setError(result.error);
          }
          return;
        }

        if (result?.ok) {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch {
        setError('Authentication service unavailable. Please retry.');
      }
    });
  };

  return (
    <div className="w-full max-w-[360px] mx-auto">
      {/* Minimal Aesthetic Card */}
      <div className="rounded-2xl border border-admin-border bg-admin-surface/80 backdrop-blur-xl p-7 shadow-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-admin-muted-bg border border-admin-border text-admin-fg mb-3.5 shadow-sm">
            <Shield size={20} strokeWidth={2.2} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-admin-fg">SpecPulse</h1>
          <p className="mt-1 text-xs text-admin-muted">Sign in to your account</p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 text-center animate-in fade-in duration-150"
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-admin-fg/80 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              disabled={isPending}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full h-9 rounded-lg border border-admin-border bg-admin-bg/50 px-3 text-sm text-admin-fg placeholder:text-admin-muted/50 transition-colors focus:border-admin-accent focus:bg-admin-bg focus:outline-none focus:ring-1 focus:ring-admin-accent disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-admin-fg/80 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={isPending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-9 rounded-lg border border-admin-border bg-admin-bg/50 pl-3 pr-9 text-sm text-admin-fg placeholder:text-admin-muted/50 transition-colors focus:border-admin-accent focus:bg-admin-bg focus:outline-none focus:ring-1 focus:ring-admin-accent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-admin-muted hover:text-admin-fg transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-admin-primary text-admin-primary-fg text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-admin-accent/30 disabled:pointer-events-none disabled:opacity-50 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
