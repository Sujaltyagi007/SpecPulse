import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { DEFAULT_BANNER_DIRECTIONS, DEFAULT_BANNER_TEMPLATE } from '@/lib/articles/banner-defaults';

/**
 * Settings the admin can change from the panel (Settings → AI & API keys). Lookup order: panel override (the
 * app_settings table), then the .env value, then the built-in default. Secrets are stored AES-256-GCM encrypted
 * with a key derived from SETTINGS_SECRET (or ADMIN_PASSWORD), and never sent back to the browser.
 */

export type SettingKind = 'secret' | 'text' | 'select' | 'number' | 'prompt' | 'json';
export type SettingGroup = 'keys' | 'image' | 'prompts' | 'advanced';

export interface SettingDef {
  key: string;
  label: string;
  group: SettingGroup;
  kind: SettingKind;
  hint?: string;
  options?: string[];
  min?: number;
  max?: number;
  /** Used when neither the panel nor .env sets a value. */
  fallback?: string;
}

export const IMAGE_MODELS = ['gpt-image-2', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'];

export const SETTINGS: SettingDef[] = [
  { key: 'IMAGE_API_KEY', label: 'OpenAI key (banner images)', group: 'keys', kind: 'secret', hint: 'platform.openai.com → API keys. The account needs billing credit.' },
  { key: 'SERPAPI_API_KEY', label: 'SerpAPI key', group: 'keys', kind: 'secret', hint: 'Prices, trending topics and search-snippet research.' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic key', group: 'keys', kind: 'secret', hint: 'Only used when no LLM pool is configured.' },

  { key: 'IMAGE_MODEL', label: 'Image model', group: 'image', kind: 'select', options: IMAGE_MODELS, fallback: 'gpt-image-2', hint: 'gpt-image-2 and newer render the banner shape directly and look sharper.' },
  { key: 'IMAGE_QUALITY', label: 'Quality', group: 'image', kind: 'select', options: ['low', 'medium', 'high', 'xhigh', 'max'], fallback: 'high', hint: 'Higher costs more. xhigh and max only work on the gpt-image-2.5 models.' },
  { key: 'ARTICLE_COVER_CANDIDATES', label: 'Options per generation', group: 'image', kind: 'number', min: 1, max: 3, fallback: '3', hint: 'One image per art direction. Fewer is cheaper.' },
  { key: 'IMAGE_BASE_URL', label: 'Custom API base URL', group: 'image', kind: 'text', hint: 'Leave empty for OpenAI. Set only for an OpenAI-compatible proxy.' },

  { key: 'BANNER_PROMPT_TEMPLATE', label: 'Banner prompt', group: 'prompts', kind: 'prompt', fallback: DEFAULT_BANNER_TEMPLATE },
  { key: 'BANNER_DIRECTION_HERO', label: 'Art direction 1: Cinematic hero', group: 'prompts', kind: 'prompt', fallback: DEFAULT_BANNER_DIRECTIONS.hero },
  { key: 'BANNER_DIRECTION_COLOR', label: 'Art direction 2: Bold colour', group: 'prompts', kind: 'prompt', fallback: DEFAULT_BANNER_DIRECTIONS.color },
  { key: 'BANNER_DIRECTION_KINETIC', label: 'Art direction 3: Kinetic energy', group: 'prompts', kind: 'prompt', fallback: DEFAULT_BANNER_DIRECTIONS.kinetic },

  { key: 'LLM_POOL', label: 'LLM pool (JSON)', group: 'advanced', kind: 'json', hint: 'Which text models write and score articles, and which key each one uses. Key names listed here appear under API keys.' },
];

/** Never editable from the panel: changing these could lock the admin out or break the database connection. */
const LOCKED = /^(DATABASE_URL.*|ADMIN_.*|SETTINGS_SECRET|CRON_SECRET|NODE_ENV|NEXT_.*)$/;

/** Key names an LLM pool refers to (e.g. GEMINI_KEY_1), so they can be edited alongside the fixed keys. */
export function poolKeyNames(poolJson: string | undefined): string[] {
  if (!poolJson) return [];
  try {
    const entries = JSON.parse(poolJson) as { keys?: unknown }[];
    const names = entries.flatMap((e) => (Array.isArray(e.keys) ? e.keys.filter((k): k is string => typeof k === 'string') : []));
    return [...new Set(names)].filter((k) => /^[A-Z][A-Z0-9_]{1,63}$/.test(k) && !LOCKED.test(k));
  } catch {
    return [];
  }
}

/** The fixed settings plus a secret entry for every key name the current LLM pool uses. */
export async function settingDefs(): Promise<SettingDef[]> {
  const fixed = new Set(SETTINGS.map((d) => d.key));
  const extra = poolKeyNames(await getSetting('LLM_POOL'))
    .filter((k) => !fixed.has(k))
    .map((key): SettingDef => ({ key, label: key, group: 'keys', kind: 'secret', hint: 'Used by the LLM pool.' }));
  return [...SETTINGS.slice(0, 3), ...extra, ...SETTINGS.slice(3)];
}

// --- encryption -------------------------------------------------------------------------------------------------

const PREFIX = 'enc:v1:';

function cipherKey(): Buffer {
  const secret = process.env.SETTINGS_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('Set SETTINGS_SECRET (or ADMIN_PASSWORD) in .env before saving keys from the panel.');
  return createHash('sha256').update(`specpulse-settings:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cipherKey(), iv);
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
}

function decryptSecret(stored: string): string | undefined {
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const d = createDecipheriv('aes-256-gcm', cipherKey(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return undefined; // secret changed since it was saved: fall back to .env
  }
}

// --- lookup -----------------------------------------------------------------------------------------------------

const TTL_MS = 10_000;
let cache: { at: number; rows: Map<string, string> } | null = null;

async function overrides(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  try {
    const { prisma } = await import('@/lib/db'); // lazy: keeps modules that only build prompts usable without a DB
    const rows = await prisma.appSetting.findMany();
    cache = { at: Date.now(), rows: new Map(rows.map((r) => [r.key, r.value])) };
  } catch {
    cache = { at: Date.now(), rows: new Map() }; // table missing (migration not run yet): behave like .env only
  }
  return cache.rows;
}

export function clearSettingsCache() {
  cache = null;
}

export type SettingSource = 'panel' | 'env' | 'default' | 'unset';

/** Value and where it came from. Empty strings count as unset. */
export async function resolveSetting(key: string): Promise<{ value: string | undefined; source: SettingSource }> {
  const stored = (await overrides()).get(key);
  if (stored !== undefined) {
    const value = decryptSecret(stored);
    if (value) return { value, source: 'panel' };
  }
  const env = process.env[key];
  if (env) return { value: env, source: 'env' };
  const fallback = SETTINGS.find((d) => d.key === key)?.fallback;
  return fallback !== undefined ? { value: fallback, source: 'default' } : { value: undefined, source: 'unset' };
}

export async function getSetting(key: string): Promise<string | undefined> {
  return (await resolveSetting(key)).value;
}

/** Keys the panel may write: the fixed settings plus key names referenced by the (current or new) LLM pool. */
export async function isEditableKey(key: string, newPool?: string): Promise<SettingDef | undefined> {
  if (LOCKED.test(key)) return undefined;
  const fixed = SETTINGS.find((d) => d.key === key);
  if (fixed) return fixed;
  const pooled = new Set([...poolKeyNames(await getSetting('LLM_POOL')), ...poolKeyNames(newPool)]);
  return pooled.has(key) ? { key, label: key, group: 'keys', kind: 'secret' } : undefined;
}
