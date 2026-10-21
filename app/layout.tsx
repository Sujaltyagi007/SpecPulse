import './globals.css';
import type { Metadata, Viewport } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { ThemeScript } from '@/components/site/theme-script';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: verified tech specs and live prices`, template: `%s | ${SITE_NAME}` },
  description: 'Human-verified specifications and daily-checked prices for consumer tech.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Public-site theme choice; only .site styles read data-theme, so the admin console is unaffected. */}
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
