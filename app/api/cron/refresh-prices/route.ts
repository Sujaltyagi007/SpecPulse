import { productPath } from '@/lib/site';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { rejectUnauthorizedCron } from '@/lib/cron';
import { refreshPrices } from '@/lib/ingest/refresh-prices';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = rejectUnauthorizedCron(request);
  if (denied) return denied;

  const result = await refreshPrices(console.log);
  for (const t of result.touched) revalidatePath(productPath(t.categorySlug, t.slug));
  if (result.touched.length) revalidatePath('/');

  return NextResponse.json({ ...result, touched: result.touched.length });
}
