import Link from 'next/link';
import type { FaqItem } from '@/lib/products';
import { BadgeCheck, BatteryCharging, Bluetooth, CalendarClock, ChevronDown, Droplets, Ear, FileSearch, Headphones, LineChart, Music2, Plug, Rocket, Scale, Store, Weight } from 'lucide-react';

const STAGES = [
  {
    icon: FileSearch,
    title: 'Sourced',
    text: 'We start from the exact model and its barcode (GTIN), and gather the manufacturer’s own spec sheets.',
  },
  {
    icon: BadgeCheck,
    title: 'Checked by a person',
    text: 'An editor confirms every required spec against those sources and ticks it verified. Missing a spec? It waits.',
  },
  {
    icon: CalendarClock,
    title: 'Priced',
    text: 'Retailer prices are fetched every morning. A product needs a price seen in the last 72 hours to go live.',
  },
  {
    icon: Rocket,
    title: 'Published, then re-checked',
    text: 'Approved pages are released a few a day and re-checked before they go out. Prices keep refreshing daily.',
  },
];

export function PublishTimeline() {
  return (
    <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className="relative rounded-[1.75rem] border border-line bg-surface p-6">
          <span className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon size={20} aria-hidden /></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Step {i + 1}</span>
          </span>
          <b className="mt-5 block text-lg font-semibold tracking-tight text-fg">{title}</b>
          <p className="m-0 mt-2 text-[0.9375rem] text-fg-2">{text}</p>
        </li>
      ))}
    </ol>
  );
}


const SPECS = [
  {
    icon: Ear,
    name: 'Active noise cancelling',
    what: 'Microphones listen to the room and play an inverse sound wave to cancel steady noise like engines and fans.',
    tip: 'Great for commutes and flights; less effective on sudden sounds like voices.',
  },
  {
    icon: BatteryCharging,
    name: 'Battery life (buds)',
    what: 'How long the earbuds play on one charge, as rated by the maker — usually measured with ANC off.',
    tip: 'Expect less with ANC on and at high volume.',
  },
  {
    icon: Plug,
    name: 'Battery life (with case)',
    what: 'Total listening time including the recharges the case holds.',
    tip: 'This tells you how often you will charge the case, not how long one session lasts.',
  },
  {
    icon: Bluetooth,
    name: 'Bluetooth version',
    what: 'The wireless standard the buds support. Newer versions bring better efficiency and features like LE Audio.',
    tip: 'Benefits only apply when your phone supports the same version.',
  },
  {
    icon: Music2,
    name: 'Codecs',
    what: 'How audio is compressed over Bluetooth: SBC and AAC are universal; LDAC and aptX carry more detail.',
    tip: 'iPhones use AAC; many Android phones support LDAC or aptX.',
  },
  {
    icon: Droplets,
    name: 'Water resistance',
    what: 'The IP rating. The second digit is water: IPX4 handles sweat and splashes, IPX7 a brief dunk.',
    tip: 'The charging case is usually not rated, even when the buds are.',
  },
  {
    icon: Headphones,
    name: 'Wireless charging',
    what: 'Whether the case charges on a Qi pad instead of a cable.',
    tip: 'Convenient, but slower than charging by cable.',
  },
  {
    icon: Weight,
    name: 'Weight per bud',
    what: 'The weight of a single earbud in grams.',
    tip: 'Lighter buds generally stay comfortable for longer listening sessions.',
  },
];

export function SpecGlossary() {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
      {SPECS.map(({ icon: Icon, name, what, tip }) => (
        <div key={name} className="flex w-[78%] shrink-0 snap-start flex-col rounded-3xl bg-surface p-5 ring-1 ring-line sm:w-auto">
          <span className="grid size-10 place-items-center rounded-xl bg-soft text-fg-2"><Icon size={18} aria-hidden /></span>
          <b className="mt-4 text-[0.9375rem] font-semibold tracking-tight text-fg">{name}</b>
          <p className="m-0 mt-1.5 text-sm text-fg-2">{what}</p>
          <p className="m-0 mt-auto pt-3 text-xs text-muted">
            <span className="font-medium text-accent">Tip · </span>{tip}
          </p>
        </div>
      ))}
    </div>
  );
}


const HABITS = [
  { icon: LineChart, title: 'Check the price history', text: 'A “deal” is only a deal against what the product usually costs. Look at the trend before you buy.' },
  { icon: Store, title: 'Compare every store', text: 'The same model can differ a lot between retailers on the same day, and stock changes quickly.' },
  { icon: BadgeCheck, title: 'Read the spec, not the slogan', text: 'Terms like “all-day battery” mean little. The rated hours, codec and IP rating tell you more.' },
  { icon: Scale, title: 'Compare like for like', text: 'Put two finalists side by side on the specs that matter to you, and ignore the rest.' },
];

export function BuyingHabits() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-12">
      <div>
        <h2 className="m-0 text-[clamp(1.75rem,4vw,2.75rem)] text-fg">Buy smarter in four habits.</h2>
        <p className="m-0 mt-3 max-w-md text-[1.0625rem] text-fg-2">
          The same checks our editors use, so you can make a confident choice anywhere.
        </p>
        <Link href="/compare" className="btn btn-lg mt-6">Compare products</Link>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {HABITS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-3xl bg-surface p-5 ring-1 ring-line">
            <Icon size={20} aria-hidden className="text-accent" />
            <b className="mt-3 block font-semibold tracking-tight text-fg">{title}</b>
            <p className="m-0 mt-1.5 text-sm text-fg-2">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}


export const HOME_FAQ: FaqItem[] = [
  {
    question: 'What does “verified” mean on SpecPulse?',
    answer:
      'An editor has checked every required spec for the product against the manufacturer’s own sources and marked it verified. A product cannot be published until all of its required specs pass that check.',
  },
  {
    question: 'How often are prices updated?',
    answer:
      'We re-check retailer prices every morning and keep the price history. Prices can still change during the day, so always confirm the final price at the retailer.',
  },
  {
    question: 'How does SpecPulse make money?',
    answer:
      'Some retailer links earn us a commission when you buy, at no extra cost to you. Our ranked lists are set by our editors.',
  },
  {
    question: 'Why can’t I find a product?',
    answer:
      'We only publish a product once its specs are verified and it has a recent price, so coverage grows steadily. Try search, or check back soon.',
  },
  {
    question: 'Do you test products hands-on?',
    answer:
      'No. Our pages are built on verified manufacturer specifications and live prices rather than hands-on testing, and we say so instead of guessing.',
  },
];

export function HomeFaq() {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
      {HOME_FAQ.map((f) => (
        <details key={f.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[1.0625rem] font-medium text-fg [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown size={18} aria-hidden className="shrink-0 text-muted transition group-open:rotate-180" />
          </summary>
          <p className="m-0 pb-5 pr-8 text-fg-2">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
