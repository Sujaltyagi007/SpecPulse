import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { rejectUnauthorizedCron } from '@/lib/cron';
import { runDailyArticle } from '@/lib/articles/auto';

export const dynamic = 'force-dynamic';
// Topic, research, writing, line edit and three cover images take a few minutes.
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = rejectUnauthorizedCron(request);
  if (denied) return denied;

  const result = await runDailyArticle();
  console.log('[cron:articles]', JSON.stringify(result));
  if (result.started) revalidatePath('/admin/articles');
  return NextResponse.json(result);
}
