'use server';
import OpenAI from 'openai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { PoolEntry } from '@/lib/llm/pool';
import { currentUsername } from '@/lib/admin-user';
import { buildBannerPrompts } from '@/lib/articles/image';
import { clearSettingsCache, encryptSecret, getSetting, isEditableKey, type SettingDef } from '@/lib/settings';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const Change = z.object({ key: z.string().min(1).max(64), value: z.string().max(20_000).nullable() });

/** Checks one value against its setting; returns the value to store or an error message. */
function validate(def: SettingDef, raw: string): { value: string } | { error: string } {
  const value = raw.trim();
  switch (def.kind) {
    case 'secret':
      if (!value) return { error: `${def.label}: paste a key, or use "Use .env" to clear it` };
      if (/\s/.test(value) || value.length > 500) return { error: `${def.label}: that doesn't look like an API key` };
      return { value };
    case 'select':
      if (def.key === 'IMAGE_MODEL' ? !/^[a-z0-9][a-z0-9.\-]{1,63}$/.test(value) : !def.options?.includes(value)) {
        return { error: `${def.label}: pick one of the listed options` };
      }
      return { value };
    case 'number': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < (def.min ?? -Infinity) || n > (def.max ?? Infinity)) return { error: `${def.label}: must be ${def.min}–${def.max}` };
      return { value: String(n) };
    }
    case 'text':
      if (def.key === 'IMAGE_BASE_URL' && value && !/^https?:\/\/\S+$/.test(value)) return { error: `${def.label}: must be an http(s) URL` };
      return { value };
    case 'prompt':
      if (value.length < 20) return { error: `${def.label}: too short to be a useful prompt` };
      if (def.key === 'BANNER_PROMPT_TEMPLATE' && !/\{\{\s*subject\s*\}\}/.test(value)) {
        return { error: 'Banner prompt: keep the {{subject}} placeholder, or every banner will show the same thing' };
      }
      return { value };
    case 'json':
      try {
        z.array(PoolEntry).min(1).parse(JSON.parse(value));
        return { value };
      } catch (e) {
        return { error: `${def.label}: ${e instanceof SyntaxError ? 'not valid JSON' : 'each entry needs provider, model and keys'}` };
      }
  }
}

/** Saves panel overrides. A null value removes the override so .env (or the built-in default) applies again. */
export async function saveIntegrationSettings(input: unknown): Promise<Result> {
  const parsed = z.array(Change).max(50).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request' };
  const newPool = parsed.data.find((c) => c.key === 'LLM_POOL')?.value ?? undefined;

  const writes: ({ op: 'delete'; key: string } | { op: 'set'; key: string; value: string })[] = [];
  for (const change of parsed.data) {
    const def = await isEditableKey(change.key, newPool);
    if (!def) return { ok: false, error: `${change.key} can't be changed from the panel` };
    if (change.value === null) {
      writes.push({ op: 'delete', key: change.key });
      continue;
    }
    const checked = validate(def, change.value);
    if ('error' in checked) return { ok: false, error: checked.error };
    try {
      writes.push({ op: 'set', key: change.key, value: def.kind === 'secret' ? encryptSecret(checked.value) : checked.value });
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  const updatedBy = await currentUsername();
  await prisma.$transaction(
    writes.map((w) =>
      w.op === 'delete'
        ? prisma.appSetting.deleteMany({ where: { key: w.key } })
        : prisma.appSetting.upsert({ where: { key: w.key }, create: { key: w.key, value: w.value, updatedBy }, update: { value: w.value, updatedBy } }),
    ),
  );
  clearSettingsCache();
  revalidatePath('/admin/settings/integrations');
  return { ok: true };
}

/**
 * Checks the image key end to end with the cheapest possible image (gpt-image-1-mini, low quality, about $0.005),
 * so a missing-credit or wrong-key problem shows up here instead of as a silent fallback banner.
 */
export async function testImageKey(unsavedKey?: string): Promise<Result<{ message: string; models: string[] }>> {
  const apiKey = unsavedKey?.trim() || (await getSetting('IMAGE_API_KEY'));
  if (!apiKey) return { ok: false, error: 'No key to test. Paste one first.' };
  const client = new OpenAI({ apiKey, baseURL: (await getSetting('IMAGE_BASE_URL')) || undefined, maxRetries: 0, timeout: 90_000 });
  let models: string[] = [];
  try {
    models = (await client.models.list()).data.map((m) => m.id).filter((id) => /^(gpt-image|chatgpt-image)/.test(id)).sort();
  } catch (e) {
    return { ok: false, error: `Key rejected: ${(e as Error).message.slice(0, 200)}` };
  }
  try {
    await client.images.generate({ model: 'gpt-image-1-mini', prompt: 'a small blue dot on white', size: '1024x1024', quality: 'low', n: 1 });
  } catch (e) {
    const msg = (e as Error).message;
    if (/credit|billing|quota|429/i.test(msg)) return { ok: false, error: `The key works but the account can't pay for images: ${msg.slice(0, 200)}` };
    if (!/model/i.test(msg)) return { ok: false, error: `Test image failed: ${msg.slice(0, 200)}` };
  }
  return { ok: true, message: `Key works and images can be generated. ${models.length} image models available.`, models };
}

/** The exact prompts the next banner generation would send, using unsaved edits from the form. */
export async function previewBannerPrompts(input: { title: string; subject: string; overrides: Record<string, string> }) {
  const overrides = Object.fromEntries(
    Object.entries(input.overrides).filter(([k, v]) => /^BANNER_/.test(k) && typeof v === 'string' && v.length <= 20_000),
  );
  return buildBannerPrompts(input.subject.slice(0, 500), input.title.slice(0, 300), overrides);
}
