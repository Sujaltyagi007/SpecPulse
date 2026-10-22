// The daily automatic article: picks today's trending topic, then runs the normal pipeline. It always ends in
// review (or failed); publishing stays a human decision in /admin/articles.
import { prisma } from '@/lib/db';
import { runArticleJob } from '@/lib/articles/generate';

export const AUTO_AUTHOR = 'auto';

/** Max automatic articles per rolling 24 hours (ARTICLES_PER_DAY, default 1). */
const perDay = () => Math.max(0, Number(process.env.ARTICLES_PER_DAY ?? 1));

export type AutoArticleResult =
  | { started: false; reason: string }
  | { started: true; id: number; status: string; title: string | null; error: string | null };

export async function runDailyArticle(): Promise<AutoArticleResult> {
  const limit = perDay();
  if (limit === 0) return { started: false, reason: 'ARTICLES_PER_DAY is 0' };

  // Guards against double runs (retries, manual + cron) creating extra drafts.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.article.count({ where: { createdBy: AUTO_AUTHOR, createdAt: { gte: since } } });
  if (recent >= limit) return { started: false, reason: `already made ${recent} automatic article(s) in the last 24 hours` };

  const a = await prisma.article.create({
    data: {
      topic: '', // blank: the topic step picks from today's Google Trends
      slug: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'generating',
      progress: 'topic',
      createdBy: AUTO_AUTHOR,
    },
  });
  await runArticleJob(a.id);
  const done = await prisma.article.findUniqueOrThrow({ where: { id: a.id }, select: { status: true, title: true, error: true } });
  return { started: true, id: a.id, ...done };
}
