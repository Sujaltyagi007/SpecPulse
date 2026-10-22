// Home page sections, styled with Tailwind utilities (site tokens are exposed as colors in app/globals.css).
// Every band is full width with its own inner <Wrap>, so nothing relies on 100vw and nothing can scroll sideways.
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, CalendarClock, ChevronRight, LineChart, Search, ShieldCheck, Sparkles,
} from 'lucide-react';
import type { CategoryItem, ComparisonCardData, ProductListItem, RoundupCardData } from '@/lib/catalog';
import { formatPrice, productPath, SITE_NAME } from '@/lib/site';
import { CategoryIcon } from './category-icon';

type Price = { cents: number; currency: string };
export type CategorySpotlight = CategoryItem & { from: Price | null; imageUrl: string | null };
type Stats = { products: number; retailers: number; guides: number };

function Img({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- merchant images on arbitrary hosts
  return <img src={src} alt="" loading="lazy" className={className} />;
}

export function Wrap({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionTitle({ title, sub, href, linkLabel }: { title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-10">
      <div className="max-w-2xl">
        <h2 className="m-0 text-[clamp(1.75rem,4vw,2.75rem)] text-fg">{title}</h2>
        {sub && <p className="m-0 mt-2 text-[1.0625rem] text-muted">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-0.5 text-[0.9375rem] font-medium hover:underline">
          {linkLabel ?? 'View all'} <ChevronRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

function SearchPill({ dark }: { dark?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className={`flex w-full max-w-xl items-center gap-2 rounded-full p-1.5 pl-5 transition focus-within:ring-4 ${dark
      ? 'bg-white/10 text-white/60 ring-1 ring-white/15 focus-within:ring-white/20'
      : 'bg-surface text-muted shadow-card ring-1 ring-line focus-within:ring-accent-soft'
      }`}
    >
      <Search size={18} aria-hidden className="shrink-0" />
      <input type="search" name="q" placeholder="Search a product, brand or category" aria-label={`Search ${SITE_NAME}`} autoComplete="off" minLength={2} required className={`h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none ${dark ? 'text-white placeholder:text-white/50' : 'text-fg placeholder:text-muted'}`} />
      <button type="submit" aria-label="Search" className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-0 transition sm:w-auto sm:px-5 ${dark ? 'bg-white text-[#1d1d1f] hover:bg-white/90' : 'bg-accent text-accent-fg hover:bg-accent-hover'}`}>
        <ArrowRight size={18} aria-hidden className="sm:hidden" />
        <span className="hidden text-sm font-semibold sm:inline">Search</span>
      </button>
    </form>
  );
}

const PULSE = 'M0 78 H250 L272 78 L292 22 L316 112 L338 48 L352 78 H600 L618 78 L634 50 L652 98 L668 78 H1000';

const READOUTS = [
  { icon: BadgeCheck, label: 'Specs verified', sub: 'by a person', pos: 'left-[44%]' },
  { icon: CalendarClock, label: 'Prices checked', sub: 'every morning', pos: 'left-[78%]' },
];

export function HomeHero({ categories, stats }: { categories: CategoryItem[]; stats: Stats }) {
  return (
    <section aria-label={`${SITE_NAME}: verified specs and live prices`} className="relative isolate flex min-h-[calc(100svh-89px)] flex-col justify-center overflow-hidden py-[clamp(1.5rem,5svh,4.5rem)]">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_100%,var(--accent-soft),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] [background-size:22px_22px] opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_40%,#000,transparent)]" />
      <Wrap className="text-center">
        <h1 className="m-0 animate-rise text-balance text-[clamp(2.25rem,min(11vw,10.5svh),6.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-fg">
          Know the specs.
          <span className="block bg-[linear-gradient(90deg,#ea580c,#f97316_40%,#ec4899)] bg-clip-text pb-[0.08em] text-transparent">
            Catch the price.
          </span>
        </h1>
        <p className="!mx-auto mb-0 mt-[clamp(0.75rem,2.5svh,1.5rem)] max-w-xl animate-rise text-pretty text-[1.0625rem] text-fg-2 [animation-delay:120ms] sm:text-[clamp(1.0625rem,2.4svh,1.25rem)]">
          Specs checked by a person. Prices re-checked every morning
          {stats.retailers > 0 ? ` across ${stats.retailers} retailers` : ''}. The right pick, without the guesswork.
        </p>

        <div className="mx-auto mt-[clamp(1.25rem,4svh,2.5rem)] flex animate-rise justify-center [animation-delay:240ms]">
          <SearchPill />
        </div>

        <div className="mt-[clamp(0.75rem,2.5svh,1.5rem)] flex animate-rise flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.9375rem] [animation-delay:360ms]">
          <Link href="/compare" className="inline-flex items-center hover:underline">
            Compare products <ChevronRight size={16} aria-hidden />
          </Link>
          <Link href="/best" className="inline-flex items-center hover:underline">
            See the best picks <ChevronRight size={16} aria-hidden />
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="mt-[clamp(0.75rem,2.5svh,1.5rem)] flex animate-rise flex-wrap justify-center gap-2 [@media(max-height:760px)]:hidden [animation-delay:480ms]">
            {categories.slice(0, 5).map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-1.5 text-[0.8125rem] !text-fg-2 transition hover:!text-fg hover:bg-line">
                <CategoryIcon slug={c.slug} size={14} /> {c.name}
              </Link>
            ))}
          </div>
        )}
      </Wrap>

      <Wrap className="relative mt-[clamp(1.5rem,6svh,4rem)]">
        <svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden className="block h-[clamp(3rem,10svh,7rem)] w-full">
          <defs>
            <linearGradient id="pulse-fade" x1="0" x2="1">
              <stop offset="0" stopColor="#f97316" stopOpacity="0" />
              <stop offset="0.15" stopColor="#f97316" />
              <stop offset="0.85" stopColor="#ec4899" />
              <stop offset="1" stopColor="#ec4899" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={PULSE} pathLength={1} fill="none" stroke="url(#pulse-fade)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" strokeDasharray="1" className="animate-draw" />
          <path d={PULSE} pathLength={1} fill="none" stroke="#fff7ed" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray="0.06 1.06" className="animate-scan opacity-90 mix-blend-overlay" />
        </svg>
        {READOUTS.map(({ icon: Icon, label, sub, pos }, i) => (
          <div key={label} className={`absolute top-[65%] hidden -translate-x-1/2 -translate-y-1/2 items-center whitespace-nowrap gap-2.5 rounded-2xl bg-surface/85 py-2 pl-2 pr-4 shadow-card ring-1 ring-line backdrop-blur md:[@media(min-height:561px)]:flex ${pos} ${i ? 'animate-float-slow' : 'animate-float'}`}>
            <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={16} aria-hidden /></span>
            <span className="text-left leading-tight">
              <b className="block text-[0.8125rem] font-semibold text-fg">{label}</b>
              <small className="block text-xs text-muted">{sub}</small>
            </span>
          </div>
        ))}
      </Wrap>
    </section>
  );
}

export function CategoryRow({ categories }: { categories: CategorySpotlight[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {categories.map((c) => (
        <Link key={c.slug} href={`/${c.slug}`} className="group flex w-32 shrink-0 snap-start flex-col items-center rounded-3xl p-3 text-center !text-fg transition hover:bg-soft sm:w-36">
          <span className="grid size-20 place-items-center overflow-hidden rounded-full bg-soft text-accent transition duration-300 group-hover:scale-105 group-hover:bg-surface group-hover:shadow-card sm:size-24">
            {c.imageUrl ? <Img src={c.imageUrl} className="size-14 object-contain sm:size-16" /> : <CategoryIcon slug={c.slug} size={30} />}
          </span>
          <span className="mt-3 text-sm font-medium leading-tight">{c.name}</span>
          <span className="mt-1 text-xs text-muted">
            {c.from ? `From ${formatPrice(c.from.cents, c.from.currency)}` : c.productCount ? `${c.productCount} products` : 'Coming soon'}
          </span>
        </Link>
      ))}
    </div>
  );
}

const SPEC_ROWS = ['Display', 'Battery life', 'Weight', 'Connectivity'];

export function WhyBento({ stats }: { stats: Stats }) {
  const figures = [
    { label: 'products verified', value: stats.products },
    { label: 'retailers tracked', value: stats.retailers },
    { label: 'buying guides', value: stats.guides },
  ].filter((f) => f.value > 0);
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#1d1d1f] p-7 text-white sm:p-10 md:col-span-4">
        <span className="text-sm font-medium text-[#fb923c]">Verified specs</span>
        <h3 className="m-0 mt-2 max-w-md text-[clamp(1.6rem,3.2vw,2.4rem)] font-semibold leading-tight tracking-tight text-white">
          Every number, checked by a person.
        </h3>
        <p className="m-0 mt-3 max-w-md text-white/65">
          Specs are matched against manufacturer sources before a page goes live. No scraped guesses, no invented figures.
        </p>
        <ul className="m-0 mt-8 grid max-w-md list-none gap-2 p-0">
          {SPEC_ROWS.map((row) => (
            <li key={row} className="flex items-center justify-between rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
              <span className="text-[0.9375rem] text-white/85">{row}</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                <BadgeCheck size={14} aria-hidden /> Verified
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,#fff7ed,#ffedd5_55%,#fde2ec)] p-7 sm:p-10 md:col-span-2 dark:bg-[linear-gradient(160deg,#2a1608,#3a1d0c_55%,#3a1626)]">
        <span className="text-sm font-medium text-accent">Live prices</span>
        <div>
          <span className="block text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-tighter text-fg">Daily</span>
          <p className="m-0 mt-3 text-fg-2">Every retailer price is re-checked each morning, and stale offers are hidden.</p>
        </div>
      </div>

      <div className="flex flex-col rounded-[2rem] bg-soft p-7 sm:p-8 md:col-span-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent"><LineChart size={15} aria-hidden /> Price history</span>
        <p className="m-0 mt-2 text-fg-2">See whether today&apos;s price is actually a good one.</p>
        <svg viewBox="0 0 200 70" aria-hidden className="mt-6 h-20 w-full">
          <path d="M0 22 L28 26 L52 18 L80 34 L104 30 L128 46 L150 40 L176 56 L200 52" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0 22 L28 26 L52 18 L80 34 L104 30 L128 46 L150 40 L176 56 L200 52 V70 H0 Z" fill="var(--accent-soft)" />
          <circle cx="176" cy="56" r="4.5" fill="var(--accent)" stroke="var(--bg-soft)" strokeWidth="2" />
        </svg>
      </div>

      <div className="flex flex-col rounded-[2rem] bg-soft p-7 sm:p-8 md:col-span-2">
        <span className="text-sm font-medium text-accent">Head to head</span>
        <p className="m-0 mt-2 text-fg-2">Two products, every verified spec, side by side.</p>
        <div aria-hidden className="mt-6 flex items-center justify-center gap-3">
          <span className="h-20 w-16 rounded-2xl bg-surface shadow-card ring-1 ring-line" />
          <span className="grid size-10 place-items-center rounded-full bg-fg text-xs font-bold text-bg">VS</span>
          <span className="h-20 w-16 rounded-2xl bg-surface shadow-card ring-1 ring-line" />
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-[2rem] bg-accent p-7 text-accent-fg sm:p-8 md:col-span-2">
        <Sparkles size={22} aria-hidden />
        {figures.length > 0 ? (
          <dl className="m-0 mt-6 grid gap-3">
            {figures.map((f) => (
              <div key={f.label} className="flex items-baseline gap-2">
                <dd className="m-0 text-3xl font-semibold tracking-tight tabular-nums">{f.value}</dd>
                <dt className="text-sm opacity-80">{f.label}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <p className="m-0 mt-6 text-lg font-medium leading-snug">
            Honest by design. Some retailer links earn us a commission; our rankings are set by editors.
          </p>
        )}
      </div>
    </div>
  );
}

export function ProductRail({ products }: { products: ProductListItem[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
      {products.map((p) => (
        <Link key={p.slug} href={productPath(p.categorySlug, p.slug)} className="group flex w-[min(78vw,260px)] shrink-0 snap-start flex-col rounded-[1.75rem] bg-soft p-4 !text-fg transition duration-300 hover:bg-surface hover:shadow-card-lg">
          <span className="inline-flex items-center gap-1 self-start text-xs font-medium text-ok">
            <ShieldCheck size={12} aria-hidden /> Verified specs
          </span>
          <div className="grid aspect-square place-items-center">
            {p.imageUrl ? (
              <Img src={p.imageUrl} className="size-4/5 object-contain mix-blend-multiply transition duration-500 group-hover:scale-105 dark:mix-blend-normal" />
            ) : (
              <span className="text-6xl font-semibold text-line-strong">{(p.brand ?? p.title).charAt(0)}</span>
            )}
          </div>
          <span className="text-xs text-muted">{p.brand}</span>
          <span className="mt-0.5 line-clamp-2 text-base font-semibold leading-snug tracking-tight">{p.title}</span>
          <span className="mt-auto flex items-end justify-between gap-2 pt-4">
            <span>
              {p.bestPrice ? (
                <span className="block text-lg font-semibold tracking-tight">{formatPrice(p.bestPrice.cents, p.bestPrice.currency)}</span>
              ) : (
                <span className="block text-sm text-muted">Check current price</span>
              )}
              {p.offerCount > 1 && <span className="block text-xs text-muted">at {p.offerCount} stores</span>}
            </span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fg text-bg transition group-hover:bg-accent group-hover:text-accent-fg">
              <ArrowUpRight size={16} aria-hidden />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ComparisonGrid({ comparisons }: { comparisons: ComparisonCardData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {comparisons.map((c) => (
        <Link key={c.slug} href={`/compare/${c.slug}`} className="group grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[1.75rem] border border-line bg-surface p-5 !text-fg transition hover:border-transparent hover:shadow-card-lg sm:p-6">
          {[c.a, c.b].map((side, i) => (
            <div key={side.title} className={`flex min-w-0 flex-col items-center gap-3 text-center ${i ? 'col-start-3' : ''}`}>
              <span className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-soft sm:size-24">
                {side.imageUrl ? <Img src={side.imageUrl} className="size-4/5 object-contain" /> : <b className="text-2xl text-muted">{side.brand.charAt(0)}</b>}
              </span>
              <b className="line-clamp-2 text-sm font-medium leading-snug">{side.title}</b>
            </div>
          ))}
          <span className="col-start-2 row-start-1 grid size-10 place-items-center rounded-full bg-soft text-xs font-bold text-muted transition group-hover:bg-accent group-hover:text-accent-fg">
            VS
          </span>
        </Link>
      ))}
    </div>
  );
}

const ROUNDUP_THEMES = [
  'bg-[linear-gradient(150deg,#1d1d1f,#2c2c2e)]',
  'bg-[linear-gradient(150deg,#c2410c,#f97316)]',
  'bg-[linear-gradient(150deg,#831843,#db2777)]',
];

export function RoundupShowcase({ roundups }: { roundups: RoundupCardData[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {roundups.map((r, i) => (
        <Link key={r.slug} href={`/best/${r.slug}`} className={`group relative flex min-h-60 flex-col overflow-hidden rounded-[1.75rem] p-7 !text-white transition duration-300 hover:-translate-y-1 hover:shadow-card-lg ${ROUNDUP_THEMES[i % ROUNDUP_THEMES.length]}`}>
          <span className="text-xs font-medium uppercase tracking-wider text-white/65">{r.category} · {r.picks} picks</span>
          <span className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{r.title}</span>
          {r.useCase && <span className="mt-2 line-clamp-2 text-sm text-white/70">{r.useCase}</span>}
          <span className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium">
            See the picks <ChevronRight size={16} aria-hidden className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ClosingCta() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#1d1d1f] px-6 py-14 text-center sm:px-12 sm:py-20">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(249,115,22,0.35),transparent)]" />
      <div className="relative">
        <h2 className="m-0 text-balance text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-tight text-white">
          Stop guessing. Start comparing.
        </h2>
        <p className="!mx-auto mb-0 mt-3 max-w-md text-white/65">Search any product to see its verified specs and today&apos;s lowest price.</p>
        <div className="mt-8 flex justify-center">
          <SearchPill dark />
        </div>
      </div>
    </div>
  );
}
