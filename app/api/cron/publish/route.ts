import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { publishBatch } from '@/lib/publish';
import { rejectUnauthorizedCron } from '@/lib/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = rejectUnauthorizedCron(request);
  if (denied) return denied;

  const result = await publishBatch(console.log);
  for (const path of result.paths) revalidatePath(path);
  if (result.paths.length) {
    revalidatePath('/');
    revalidatePath('/sitemap.xml');
  }

  return NextResponse.json(result);
}
