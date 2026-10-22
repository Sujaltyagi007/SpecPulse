import { z } from 'zod';
import type { ResearchResult } from '@/lib/llm/pool';
import { getSetting } from '@/lib/settings';
import { serpApiConfigFromEnv } from '@/lib/ingest/serpapi';

export async function canUseSerpApi(): Promise<boolean> {
  return !!(await getSetting('SERPAPI_API_KEY'));
}

async function serp(params: Record<string, string>): Promise<unknown> {
  const { apiKey, gl, hl } = await serpApiConfigFromEnv();
  const url = new URL('https://serpapi.com/search.json');
  url.search = new URLSearchParams({ gl, hl, ...params, api_key: apiKey }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: 'no-store' });
  if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { error?: string };
  if (body.error && !/hasn't returned any results/i.test(body.error)) throw new Error(`SerpApi: ${body.error}`);
  return body;
}

const Trend = z.object({
  query: z.string(),
  search_volume: z.number().optional(),
  increase_percentage: z.number().optional(),
  trend_breakdown: z.array(z.string()).optional(),
});
export type Trend = z.infer<typeof Trend>;

export async function trendingTech(limit = 25): Promise<Trend[]> {
  if (!(await canUseSerpApi())) return [];
  const { gl } = await serpApiConfigFromEnv();

  const body = (await serp({ engine: 'google_trends_trending_now', geo: gl.toUpperCase(), hours: '24', category_id: '18' })) as { trending_searches?: unknown[] };

  const trends = (body.trending_searches ?? []).flatMap((t) => {
    const parsed = Trend.safeParse(t);
    return parsed.success ? [parsed.data] : [];
  });

  return trends.sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0)).slice(0, limit);
}

export function formatTrends(trends: Trend[]): string {
  return trends.map((t) => {
    const stats = [t.search_volume && `${t.search_volume.toLocaleString('en-US')}+ searches`, t.increase_percentage && `+${t.increase_percentage}%`].filter(Boolean).join(', ');
    const related = t.trend_breakdown?.slice(0, 4).join('; ');
    return `- ${t.query}${stats ? ` (${stats})` : ''}${related ? ` — related: ${related}` : ''}`;
  }).join('\n');
}

const Organic = z.object({
  title: z.string(),
  link: z.string().url(),
  snippet: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
});

const LOW_QUALITY = /(^|\.)(reddit|quora|youtube|facebook|instagram|tiktok|pinterest|x|twitter|medium)\.com$/i;
export async function serpResearch(topic: string, maxSources = 8): Promise<ResearchResult> {
  const body = (await serp({ engine: 'google', q: topic, num: '20' })) as { organic_results?: unknown[] };
  const results = (body.organic_results ?? []).flatMap((r) => {
    const parsed = Organic.safeParse(r);
    if (!parsed.success || !parsed.data.snippet) return [];
    const host = new URL(parsed.data.link).hostname.replace(/^www\./, '');
    return LOW_QUALITY.test(host) ? [] : [{ ...parsed.data, host }];
  });
  const perHost = new Map<string, number>();
  const picked = results.filter((r) => {
    const n = (perHost.get(r.host) ?? 0) + 1;
    perHost.set(r.host, n);
    return n <= 2;
  }).slice(0, maxSources);

  const notes = ['KEY FACTS (from Google search result snippets; each is a short excerpt of the page, not the full page)', ...picked.map((r, i) => `- ${r.snippet} | SEARCH SNIPPET | Source: [${i + 1}] ${r.title}, ${r.host}${r.date ? `, ${r.date}` : ''}`), '', 'NOT FOUND', '- Anything not stated in the snippets above.'].join('\n');
  return { notes, sources: picked.map((r) => ({ title: r.title, url: r.link })), model: 'serpapi:google' };
}
