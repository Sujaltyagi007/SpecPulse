import Link from 'next/link';
import { Flame, Sparkles, TrendingDown, ShieldCheck, Trophy, Zap } from 'lucide-react';

interface MarqueeItem {
  icon: React.ReactNode;
  badge: string;
  badgeTone: 'accent' | 'ok' | 'amber' | 'purple';
  text: string;
  href: string;
}

const MARQUEE_ITEMS: MarqueeItem[] = [
  {
    icon: <Flame size={13} />,
    badge: 'TRENDING',
    badgeTone: 'amber',
    text: 'RingConn Gen 2 vs. Oura Ring 4: Battery & Subscription Breakdown',
    href: '/compare',
  },
  {
    icon: <Zap size={13} />,
    badge: 'NEW LAUNCH',
    badgeTone: 'accent',
    text: 'Flagship Titanium Smartphones & Qi2 15W Wireless Chargers Verified',
    href: '/articles',
  },
  {
    icon: <TrendingDown size={13} />,
    badge: 'PRICE CHECK',
    badgeTone: 'ok',
    text: '1,400+ Daily Price Drops Monitored Across Amazon, Best Buy & B&H',
    href: '/best',
  },
  {
    icon: <ShieldCheck size={13} />,
    badge: 'VERIFIED',
    badgeTone: 'purple',
    text: '100% Human-Verified Spec Sheets — Ground Truth with Zero Hallucinations',
    href: '/search',
  },
  {
    icon: <Trophy size={13} />,
    badge: 'TOP PICKS',
    badgeTone: 'amber',
    text: 'Best Handheld Gaming PCs & OLED Monitors for 2026 Tested',
    href: '/best',
  },
];

export function MarqueeStrip() {
  return (
    <div className="marquee-strip" role="region" aria-label="Trending tech news and updates">
      <div className="marquee-track">
        {/* Render items twice to create seamless infinite loop */}
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className="marquee-item"
            tabIndex={idx >= MARQUEE_ITEMS.length ? -1 : 0}
          >
            <span className={`marquee-badge ${item.badgeTone}`}>
              {item.icon}
              <span>{item.badge}</span>
            </span>
            <span className="marquee-text">{item.text}</span>
            <span className="marquee-sep" aria-hidden>·</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
