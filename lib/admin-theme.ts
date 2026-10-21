import { z } from 'zod';
import type { CSSProperties } from 'react';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #rrggbb color');

export const AdminTheme = z.object({
  temperature: z.enum(['cool', 'warm', 'neutral']).default('cool'),
  mode: z.enum(['system', 'light', 'dark']).default('system'),
  accent: hex.default('#3b82f6'),
  button: z.union([z.literal('neutral'), z.literal('accent'), hex]).default('neutral'),
  border: z.union([z.literal('default'), hex]).default('default'),
  radius: z.enum(['sharp', 'default', 'round']).default('default'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  motion: z.enum(['full', 'reduced']).default('full'),
});
export type AdminTheme = z.infer<typeof AdminTheme>;

export const DEFAULT_THEME: AdminTheme = AdminTheme.parse({});

export function parseTheme(raw: unknown): AdminTheme {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(AdminTheme.shape) as (keyof AdminTheme)[]) {
    const field = AdminTheme.shape[key].safeParse(obj[key]);
    out[key] = field.success ? field.data : DEFAULT_THEME[key];
  }
  return out as AdminTheme;
}

export const ACCENTS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#0d9488' },
] as const;

export const PRESETS: { name: string; theme: Partial<AdminTheme> }[] = [
  { name: 'Ocean', theme: { temperature: 'cool', accent: '#3b82f6', button: 'neutral', border: 'default' } },
  { name: 'Sunset', theme: { temperature: 'warm', accent: '#f97316', button: 'accent', border: 'default' } },
  { name: 'Forest', theme: { temperature: 'neutral', accent: '#10b981', button: 'accent', border: 'default' } },
  { name: 'Berry', theme: { temperature: 'cool', accent: '#8b5cf6', button: 'accent', border: 'default' } },
  { name: 'Ember', theme: { temperature: 'warm', accent: '#f43f5e', button: 'neutral', border: 'default' } },
  { name: 'Graphite', theme: { temperature: 'neutral', accent: '#0d9488', button: 'neutral', border: 'default' } },
];

const RADII = {
  sharp: ['4px', '3px', '6px'],
  default: ['8px', '6px', '12px'],
  round: ['14px', '10px', '20px'],
} as const;

export function readableOn(bg: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(bg.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '#0f172a' : '#ffffff';
}

export function themeAttributes(t: AdminTheme) {
  return { 'data-temp': t.temperature, 'data-mode': t.mode, 'data-density': t.density } as const;
}

export function themeStyle(t: AdminTheme): CSSProperties {
  const vars: Record<string, string> = {
    '--admin-accent': t.accent,
    '--admin-accent-fg': readableOn(t.accent),
  };
  const button = t.button === 'accent' ? t.accent : t.button;
  if (button !== 'neutral') {
    vars['--admin-primary'] = button;
    vars['--admin-primary-fg'] = readableOn(button);
  }
  if (t.border !== 'default') vars['--admin-border'] = t.border;
  const [r, sm, lg] = RADII[t.radius];
  vars['--admin-radius'] = r;
  vars['--admin-radius-sm'] = sm;
  vars['--admin-radius-lg'] = lg;
  return vars as CSSProperties;
}
