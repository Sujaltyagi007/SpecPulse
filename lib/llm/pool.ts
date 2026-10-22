import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { getSetting } from '@/lib/settings';

export const PoolEntry = z.object({
  provider: z.enum(['anthropic', 'openai-compatible']),
  model: z.string().min(1),
  keys: z.array(z.string().min(1)).min(1),
  baseURL: z.string().url().optional(),
  weight: z.number().positive().default(1),
  effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional(),
  jsonMode: z.enum(['schema', 'object']).default('schema'),
});
export type PoolEntry = z.infer<typeof PoolEntry>;

interface Slot {
  entry: PoolEntry;
  keyName: string;
  apiKey: string;
}

/** Pool and keys come from the admin panel when set there, else from .env (lib/settings.ts). */
async function loadPool(): Promise<Slot[]> {
  const raw = await getSetting('LLM_POOL');
  const entries: PoolEntry[] = raw ? z.array(PoolEntry).parse(JSON.parse(raw)) : (await getSetting('ANTHROPIC_API_KEY')) ? [PoolEntry.parse({ provider: 'anthropic', model: 'claude-opus-5-5', keys: ['ANTHROPIC_API_KEY'] })] : [];

  const slots = (await Promise.all(entries.flatMap((entry) => entry.keys.map(async (keyName) => {
    const apiKey = await getSetting(keyName);
    return apiKey ? [{ entry, keyName, apiKey }] : [];
  })))).flat();
  if (slots.length === 0) { throw new Error('No LLM configured: set LLM_POOL (and the key env vars it names) or ANTHROPIC_API_KEY.'); }
  return slots;
}


const cooldownUntil = new Map<string, number>();
const slotId = (s: Slot) => `${s.entry.provider}:${s.entry.model}:${s.keyName}`;

function orderSlots(slots: Slot[], now = Date.now()): Slot[] {
  const keyed = slots.map((s) => ({ s, k: Math.random() ** (1 / s.entry.weight) }));
  keyed.sort((a, b) => b.k - a.k);
  const ready = keyed.filter(({ s }) => (cooldownUntil.get(slotId(s)) ?? 0) <= now);
  const cooling = keyed.filter(({ s }) => (cooldownUntil.get(slotId(s)) ?? 0) > now);
  return [...ready, ...cooling].map(({ s }) => s);
}

class OutputError extends Error { }

function cooldownMs(err: unknown): number {
  if (err instanceof OutputError) return 0;
  const status = (err as { status?: number }).status;
  if (status === 401 || status === 403) return 60 * 60_000;
  if (status === 429) return 60_000;
  if (status === 400 || status === 404 || status === 422) return 10 * 60_000;
  return 30_000;
}

export interface GenerateJsonRequest<T> {
  purpose: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxAttempts?: number;
  /** Images sent before the user text (for vision models), e.g. cover candidates to score. */
  images?: { bytes: Uint8Array; type: string }[];
}

export interface GenerateJsonResult<T> {
  data: T;
  provider: string;
  model: string;
}

interface AttemptOutput<T> {
  data: T;
  inputTokens?: number;
  outputTokens?: number;
}


const SERVER_FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);

const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

async function callAnthropic<T>(slot: Slot, req: GenerateJsonRequest<T>): Promise<AttemptOutput<T>> {
  const client = new Anthropic({ apiKey: slot.apiKey, maxRetries: 0, timeout: 120_000 });
  const { model, effort } = slot.entry;
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...(req.images ?? []).map((img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif', data: base64(img.bytes) },
    })),
    { type: 'text', text: req.user },
  ];
  const res = await client.beta.messages.parse({
    model, max_tokens: 16000, system: req.system,
    messages: [{ role: 'user', content }],
    output_config: { format: betaZodOutputFormat(req.schema), ...(effort && { effort }) },
    ...(SERVER_FALLBACK_MODELS.has(model) && {
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default' as const,
    }),
  });
  if (res.stop_reason === 'refusal') throw new OutputError(`refused (${res.stop_details?.category ?? 'unknown'})`);
  if (res.stop_reason === 'max_tokens') throw new OutputError('output truncated at max_tokens');
  if (res.parsed_output == null) throw new OutputError('output did not match schema');
  return { data: res.parsed_output, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
}

async function callOpenAiCompatible<T>(slot: Slot, req: GenerateJsonRequest<T>): Promise<AttemptOutput<T>> {
  const client = new OpenAI({ apiKey: slot.apiKey, baseURL: slot.entry.baseURL, maxRetries: 0, timeout: 120_000 });
  const jsonSchema = z.toJSONSchema(req.schema) as Record<string, unknown>;
  const res = await client.chat.completions.create({
    model: slot.entry.model,
    messages: [
      { role: 'system', content: `${req.system}\n\nRespond with a single JSON object matching this JSON Schema:\n${JSON.stringify(jsonSchema)}` },
      {
        role: 'user',
        content: req.images?.length
          ? [
              ...req.images.map((img) => ({ type: 'image_url' as const, image_url: { url: `data:${img.type};base64,${base64(img.bytes)}` } })),
              { type: 'text' as const, text: req.user },
            ]
          : req.user,
      },
    ],
    response_format: slot.entry.jsonMode === 'schema' ? { type: 'json_schema', json_schema: { name: 'output', schema: jsonSchema, strict: true } } : { type: 'json_object' },
  });
  const choice = res.choices[0];
  if (!choice) throw new OutputError('no choices returned');
  if (choice.finish_reason === 'length') throw new OutputError('output truncated');
  if (choice.message.refusal) throw new OutputError(`refused: ${choice.message.refusal.slice(0, 200)}`);

  let json: unknown;
  try {
    json = JSON.parse(choice.message.content ?? '');
  } catch {
    throw new OutputError('output was not valid JSON');
  }
  const parsed = req.schema.safeParse(json);
  if (!parsed.success) throw new OutputError(`output did not match schema: ${parsed.error.message.slice(0, 300)}`);
  return { data: parsed.data, inputTokens: res.usage?.prompt_tokens, outputTokens: res.usage?.completion_tokens };
}


export async function generateJson<T>(req: GenerateJsonRequest<T>): Promise<GenerateJsonResult<T>> {
  const slots = orderSlots(await loadPool());
  const attempts = slots.slice(0, req.maxAttempts ?? slots.length);
  const failures: string[] = [];

  for (const slot of attempts) {
    const started = Date.now();
    try {
      const out =
        slot.entry.provider === 'anthropic' ? await callAnthropic(slot, req) : await callOpenAiCompatible(slot, req);
      await logCall(slot, req.purpose, started, { ok: true, inputTokens: out.inputTokens, outputTokens: out.outputTokens });
      return { data: out.data, provider: slot.entry.provider, model: slot.entry.model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const bench = cooldownMs(err);
      if (bench > 0) cooldownUntil.set(slotId(slot), Date.now() + bench);
      failures.push(`${slot.entry.model} [${slot.keyName}]: ${message}`);
      await logCall(slot, req.purpose, started, { ok: false, error: message });
    }
  }
  throw new Error(`All LLM attempts failed:\n${failures.join('\n')}`);
}

async function logCall(slot: Slot, purpose: string, started: number, r: { ok: boolean; error?: string; inputTokens?: number; outputTokens?: number },) {
  try {
    const { prisma } = await import('@/lib/db');
    await prisma.llmCall.create({
      data: {
        purpose,
        provider: slot.entry.provider,
        model: slot.entry.model,
        keyName: slot.keyName,
        ok: r.ok,
        error: r.error?.slice(0, 1000) ?? null,
        inputTokens: r.inputTokens ?? null,
        outputTokens: r.outputTokens ?? null,
        latencyMs: Date.now() - started,
      },
    });
  } catch { }
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface ResearchResult {
  notes: string;
  sources: ResearchSource[];
  model: string;
}

export async function canResearchWeb(): Promise<boolean> {
  try {
    return (await loadPool()).some((s) => s.entry.provider === 'anthropic');
  } catch {
    return false;
  }
}

export async function webResearch(req: { purpose: string; system: string; user: string; maxSearches?: number }): Promise<ResearchResult> {
  const slots = orderSlots(await loadPool()).filter((s) => s.entry.provider === 'anthropic');
  if (!slots.length) throw new Error('Web research needs an Anthropic entry in LLM_POOL.');
  const failures: string[] = [];

  for (const slot of slots) {
    const started = Date.now();
    const client = new Anthropic({ apiKey: slot.apiKey, maxRetries: 0, timeout: 240_000 });
    try {
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: req.user }];
      const sources = new Map<string, ResearchSource>();
      let notes = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for (let turn = 0; turn < 4; turn++) {
        const res = await client.messages.create({
          model: slot.entry.model,
          max_tokens: 16000,
          system: req.system,
          messages,
          tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: req.maxSearches ?? 6 }],
        });
        inputTokens += res.usage.input_tokens;
        outputTokens += res.usage.output_tokens;
        if (res.stop_reason === 'refusal') throw new OutputError(`refused (${res.stop_details?.category ?? 'unknown'})`);

        for (const block of res.content) {
          if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
            for (const r of block.content) if (!sources.has(r.url)) sources.set(r.url, { title: r.title, url: r.url });
          } else if (block.type === 'text') {
            notes += block.text;
          }
        }
        if (res.stop_reason !== 'pause_turn') break;
        messages.push({ role: 'assistant', content: res.content });
      }

      if (!notes.trim()) throw new OutputError('research returned no notes');
      await logCall(slot, req.purpose, started, { ok: true, inputTokens, outputTokens });
      return { notes: notes.trim(), sources: [...sources.values()], model: slot.entry.model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const bench = cooldownMs(err);
      if (bench > 0) cooldownUntil.set(slotId(slot), Date.now() + bench);
      failures.push(`${slot.entry.model} [${slot.keyName}]: ${message}`);
      await logCall(slot, req.purpose, started, { ok: false, error: message });
    }
  }
  throw new Error(`Web research failed:\n${failures.join('\n')}`);
}

export const __test = { orderSlots, cooldownMs, OutputError, cooldownUntil };
