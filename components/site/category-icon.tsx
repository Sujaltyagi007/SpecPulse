import { Camera, Cpu, Gamepad2, Headphones, Laptop, Monitor, Mouse, Router, Smartphone, Speaker, Tablet, Tv, Watch, type LucideIcon } from 'lucide-react';

const ICONS: [RegExp, LucideIcon][] = [
  [/earbud|headphone|headset|audio/, Headphones],
  [/phone/, Smartphone],
  [/laptop|notebook|chromebook/, Laptop],
  [/tablet|ipad/, Tablet],
  [/watch|wearable|fitness/, Watch],
  [/\btv|television/, Tv],
  [/monitor|display/, Monitor],
  [/speaker|soundbar/, Speaker],
  [/camera/, Camera],
  [/console|gaming|controller/, Gamepad2],
  [/mouse|keyboard/, Mouse],
  [/router|wifi|mesh/, Router],
];

export function CategoryIcon({ slug, size = 20 }: { slug: string; size?: number }) {
  const Icon = ICONS.find(([re]) => re.test(slug))?.[1] ?? Cpu;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}
