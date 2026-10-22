import { formatPrice } from '@/lib/site';

type Props = { currency: string; points: { day: string; cents: number }[] };

const W = 600;
const H = 160;
const PAD = 8;

export function PriceChart({ currency, points }: Props) {
  const values = points.map((p) => p.cents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (c: number) => PAD + (1 - (c - min) / span) * (H - PAD * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cents).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const current = values[values.length - 1]!;
  const fmt = (c: number) => formatPrice(c, currency);
  const label = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(d));

  return (
    <div className="panel price-chart">
      <div className="price-chart-stats">
        <div><span>Today</span><b>{fmt(current)}</b></div>
        <div><span>Lowest</span><b className="is-low">{fmt(min)}</b></div>
        <div><span>Highest</span><b>{fmt(max)}</b></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Lowest price from ${label(points[0]!.day)} to ${label(points[points.length - 1]!.day)}: between ${fmt(min)} and ${fmt(max)}, ${fmt(current)} today.`}>
        <defs>
          <linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#price-fill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="price-chart-axis">
        <span>{label(points[0]!.day)}</span>
        <span>{label(points[points.length - 1]!.day)}</span>
      </div>
    </div>
  );
}
