import { getSetting } from '@/lib/settings';
import { z } from 'zod';

const ShoppingResult = z.object({
  title: z.string(),
  source: z.string().optional(),
  link: z.string().optional(),
  product_link: z.string().optional(),
  product_id: z.string().optional(),
  extracted_price: z.number().optional(),
  second_hand_condition: z.string().optional(),
});
export type ShoppingResult = z.infer<typeof ShoppingResult>;

const ShoppingResponse = z.object({
  error: z.string().optional(),
  shopping_results: z.array(z.unknown()).optional(),
});

export interface SerpApiConfig {
  apiKey: string;
  gl: string;
  hl: string;
}

export async function serpApiConfigFromEnv(): Promise<SerpApiConfig> {
  const apiKey = await getSetting('SERPAPI_API_KEY');
  if (!apiKey) throw new Error('SERPAPI_API_KEY is not set.');
  return { apiKey, gl: process.env.SERPAPI_GL ?? 'us', hl: process.env.SERPAPI_HL ?? 'en' };
}

export async function searchGoogleShopping(query: string, cfg: SerpApiConfig): Promise<ShoppingResult[]> {
  const url = new URL('https://serpapi.com/search.json');
  url.search = new URLSearchParams({ engine: 'google_shopping', q: query, gl: cfg.gl, hl: cfg.hl, api_key: cfg.apiKey }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: 'no-store' });
  if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = ShoppingResponse.parse(await res.json());
  if (body.error) {
    if (/hasn't returned any results/i.test(body.error)) return [];
    throw new Error(`SerpApi: ${body.error}`);
  }
  return (body.shopping_results ?? []).flatMap((r) => {
    const parsed = ShoppingResult.safeParse(r);
    return parsed.success ? [parsed.data] : [];
  });
}
