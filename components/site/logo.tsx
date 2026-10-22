import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';
import { ARROW_BODY, BARS, LETTERS, SHIELD, SHIELD_EDGE } from './logo-paths';

const ARROW = '669.7,860.8 1238.5,508.3 1239.8,472.1 1356,457.9 1365.9,483.4 1248.5,618.7 1248.2,572 657.7,957';

export function LogoMark({ id, className = '' }: { id: string; className?: string }) {
  return (
    <svg viewBox="590 360 785 660" aria-hidden className={`logo-mark ${className}`}>
      <defs>
        <linearGradient id={`${id}-orange`} gradientUnits="userSpaceOnUse" x1="938.54" y1="647.643" x2="1194.53" y2="890.059">
          <stop offset="0" stopColor="rgb(232,54,1)" />
          <stop offset="1" stopColor="rgb(234,96,0)" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>

      <polygon className="logo-arrow" points={ARROW} fill="#fff" />

      <g className="logo-navy">
        <path d={SHIELD} fill="rgb(1,37,117)" />
        <path d={SHIELD_EDGE} fill="rgb(0,77,173)" />
        <g clipPath={`url(#${id}-clip)`}>
          {BARS.map((b, i) => (
            <g key={i} className="logo-bar" style={{ '--i': i, '--len': b.height } as React.CSSProperties}>
              <path d={b.d} fill="#fff" />
              <path className="logo-dot" d={b.dot} fill={b.dotFill} />
            </g>
          ))}
        </g>
      </g>

      <path className="logo-orange" d={ARROW_BODY} fill={`url(#${id}-orange)`} />
    </svg>
  );
}

export function LogoWordmark({ id, className = '' }: { id: string; className?: string }) {
  return (
    <svg viewBox="480 1080 1090 141" aria-hidden className={`logo-word ${className}`}>
      <defs>
        <linearGradient id={`${id}-navy`} gradientUnits="userSpaceOnUse" x1="783.702" y1="1217.18" x2="768.642" y2="1082.89">
          <stop offset="0" stopColor="rgb(1,38,120)" />
          <stop offset="1" stopColor="rgb(1,64,153)" />
        </linearGradient>
      </defs>
      {LETTERS.map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill={l.fill === 'url(#Gradient1)' ? `url(#${id}-navy)` : l.fill}
          className={l.navy ? 'logo-letter logo-letter-navy' : 'logo-letter'}
          style={{ '--i': i } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}

export function Logo({ id }: { id: string }) {
  return (
    <Link href="/" className="logo" aria-label={`${SITE_NAME} home`}>
      <LogoMark id={`${id}-mark`} />
      <LogoWordmark id={`${id}-word`} />
    </Link>
  );
}
