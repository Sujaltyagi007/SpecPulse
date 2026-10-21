import './site.css';
import { Inter } from 'next/font/google';
import { listCategories } from '@/lib/catalog';
import { MarqueeStrip, SiteFooter, SiteHeader } from '@/components/site';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const categories = await listCategories();
  return (
    <div className={`site ${inter.variable}`}>
      <a href="#content" className="skip-link">Skip to content</a>
      <MarqueeStrip />
      <SiteHeader categories={categories} />
      <main id="content" className="container">{children}</main>
      <SiteFooter categories={categories} />
    </div>
  );
}
