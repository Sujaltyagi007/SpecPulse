import { prisma } from '@/lib/db';
import { checkArticle } from '@/lib/articles/check';
import { humanizeDraft } from '@/lib/articles/humanize';
import { generateCoverCandidates, rankCovers } from '@/lib/articles/image';
import { getSetting } from '@/lib/settings';
import { canUseSerpApi, formatTrends, serpResearch, trendingTech } from '@/lib/articles/serp';
import { canResearchWeb, generateJson, webResearch, type ResearchSource } from '@/lib/llm/pool';
import { ARTICLE_PROMPT_VERSION, ArticleDraft, RESEARCH_SYSTEM, TOPIC_SYSTEM, TopicChoice, WRITER_SYSTEM } from '@/lib/articles/prompt';

export const ARTICLE_STEPS = ['topic', 'research', 'writing', 'humanize', 'image', 'checks'] as const;
export type ArticleStep = (typeof ARTICLE_STEPS)[number];


async function catalogContext() {
  const products = await prisma.product.findMany({
    where: { status: { in: ['published', 'approved', 'review'] } },
    include: { category: true, specs: { where: { verifiedAt: { not: null } } } },
    orderBy: { updatedAt: 'desc' },
    take: 40,
  });
  return products.map((p) => ({
    id: p.id,
    name: p.title,
    category: p.category.name,
    specs: Object.fromEntries(p.specs.map((s) => [s.key, s.value])),
  }));
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'article';
}

async function uniqueSlug(base: string, articleId: number): Promise<string> {
  let slug = base;
  for (let n = 2; ; n++) {
    const taken = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === articleId) return slug;
    slug = `${base}-${n}`;
  }
}

export function sectionsToMarkdown(sections: ArticleDraft['sections']): string {
  return sections.map((s) => `## ${s.heading.trim()}\n\n${s.body.trim()}`).join('\n\n');
}

/**
 * Generates cover candidates, ranks them with a vision model, stores them all and makes the best one the cover.
 * Returns the cover warnings for the reviewer (they all start with "Cover is", which the editor keeps on save).
 */
async function makeCovers(articleId: number, imagePrompt: string, title: string): Promise<string[]> {
  const warnings: string[] = [];
  const { images, fallbackReason } = await generateCoverCandidates(imagePrompt, title, Math.min(3, Math.max(1, Number(await getSetting('ARTICLE_COVER_CANDIDATES')) || 3)));
  if (fallbackReason) warnings.push(`Cover is a generated graphic (${fallbackReason})`);
  const { ranked, failure } = await rankCovers(images, { title, imagePrompt });
  if (failure) warnings.push(`Cover is unscored: the vision check failed (${failure}), so the first candidate was used`);
  const [best] = ranked;

  await prisma.$transaction([
    prisma.articleImage.deleteMany({ where: { articleId } }),
    prisma.articleImage.createMany({
      data: ranked.map((img, i) => ({ articleId, image: img.bytes, imageType: img.type, score: img.score, notes: img.notes, chosen: i === 0 })),
    }),
    prisma.article.update({ where: { id: articleId }, data: { heroImage: best!.bytes, heroImageType: best!.type } }),
  ]);
  return warnings;
}

export async function runArticleJob(articleId: number): Promise<void> {
  const step = (progress: ArticleStep) => prisma.article.update({ where: { id: articleId }, data: { progress } });
  try {
    let article = await prisma.article.findUniqueOrThrow({ where: { id: articleId } });
    const catalog = await catalogContext();
    const catalogText = JSON.stringify(catalog.map(({ id: _id, ...rest }) => rest), null, 1);
    let searchQuery = article.topic;

    if (!article.topic.trim()) {
      await step('topic');
      const existing = await prisma.article.findMany({ where: { id: { not: articleId }, title: { not: null } }, select: { title: true }, take: 100 });
      const todayIso = new Date().toISOString().slice(0, 10);
      // Live Google Trends ground the choice in what people search today; without them the model picks from memory.
      const trends = await trendingTech().catch(() => []);
      const { data } = await generateJson({
        purpose: 'article:topic',
        system: TOPIC_SYSTEM,
        user: `TODAY'S DATE: ${todayIso}
        TRENDING NOW (Google Trends, technology, last 24 hours, biggest first):
        ${trends.length ? formatTrends(trends) : '(unavailable: choose from your own judgement of current interest)'}
        CATALOG (verified by SpecPulse editors):
        ${catalogText}
        EXISTING ARTICLES (do not duplicate):
        ${existing.map((e) => `- ${e.title}`).join('\n') || '(none)'}
        Find the single highest-scoring, winnable tech content opportunity with clear buying or comparison intent that drives affiliate revenue.
        ${trends.length ? 'Base it on one of the TRENDING NOW searches and name it in "trend". Skip trends with no buying angle (company news, outages, people) unless there is a clear product decision behind them.' : ''}`,
        schema: TopicChoice,
      });
      article = await prisma.article.update({ where: { id: articleId }, data: { topic: data.topic.trim() } });
      searchQuery = data.targetKeyword?.trim() || data.trend?.trim() || article.topic;
    }

    await step('research');
    const researchWarnings: string[] = [];
    let researched = false;
    let notes = '';
    let sources: ResearchSource[] = [];
    if (await canResearchWeb()) {
      const r = await webResearch({
        purpose: 'article:research',
        system: RESEARCH_SYSTEM,
        user: `Topic: ${article.topic}\n\nSpecPulse covers these products (for context; research the topic broadly):\n${catalog.map((p) => `- ${p.name} (${p.category})`).join('\n') || '(none yet)'}`,
      });
      ({ notes } = r);
      sources = r.sources.slice(0, 20);
      researched = true;
    } else if (await canUseSerpApi()) {
      const r = await serpResearch(searchQuery);
      if (r.sources.length) {
        ({ notes, sources } = r);
        researched = true;
        researchWarnings.push('Research used Google search snippets (no Claude web research): check the key claims against the sources');
      }
    }

    await step('writing');
    const { data: written, provider, model } = await generateJson({
      purpose: 'article:write',
      system: WRITER_SYSTEM,
      user: `TOPIC: ${article.topic}
      CATALOG (verified by SpecPulse editors): ${catalogText}
      RESEARCH NOTES:  ${notes || '(No web research available. Write only what the catalog supports and keep general claims cautious.)'}
      SOURCES:      ${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join('\n') || '(none)'}`, schema: ArticleDraft,
    });

    await step('humanize');
    const humanized = await humanizeDraft(written, { sourceCount: sources.length, researched });
    const draft = humanized.draft;
    if (!humanized.applied) researchWarnings.push(`Humanise pass skipped: ${humanized.reason}; this is the writer's original draft`);

    const bodyMd = sectionsToMarkdown(draft.sections);
    const byName = new Map(catalog.map((p) => [p.name.toLowerCase(), p.id]));
    const relatedProductIds = draft.relatedProducts.map((n) => byName.get(n.trim().toLowerCase())).filter((id): id is number => id != null);
    const slug = await uniqueSlug(slugify(draft.title), articleId);
    await prisma.article.update({
      where: { id: articleId },
      data: {
        slug,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        bodyMd,
        faq: draft.faq,
        sources: sources.map((s) => ({ title: s.title, url: s.url })),
        relatedProductIds,
        imagePrompt: draft.imagePrompt,
        heroImageAlt: draft.imageAlt,
        generator: `${provider}:${model}`,
        promptVersion: ARTICLE_PROMPT_VERSION,
      },
    });

    await step('image');
    const coverWarnings = await makeCovers(articleId, draft.imagePrompt, draft.title);

    await step('checks');
    const { errors, warnings } = checkArticle({
      title: draft.title, summary: draft.summary, bodyMd,
      faq: draft.faq, sourceCount: sources.length, researched,
    });
    // Ends in review: a person must approve and publish it (apiPublishArticle).
    await prisma.article.update({
      where: { id: articleId },
      data: {
        validationErrors: errors, warnings: [...warnings, ...researchWarnings, ...coverWarnings], status: 'review',
        progress: null, error: null,
      },
    });
  } catch (err) {
    await prisma.article.update({
      where: { id: articleId },
      data: { status: 'failed', progress: null, error: (err instanceof Error ? err.message : String(err)).slice(0, 2000) },
    }).catch(() => { });
  }
}

export async function regenerateCover(articleId: number, customPrompt?: string): Promise<string[]> {
  const a = await prisma.article.findUniqueOrThrow({ where: { id: articleId }, omit: { heroImage: true } });
  const prompt = customPrompt?.trim() || a.imagePrompt || a.title || a.topic;
  if (customPrompt?.trim()) {
    await prisma.article.update({ where: { id: articleId }, data: { imagePrompt: customPrompt.trim() } });
  }
  const coverWarnings = await makeCovers(articleId, prompt, a.title ?? a.topic);
  const warnings = [...((a.warnings as string[]) ?? []).filter((w) => !w.startsWith('Cover is')), ...coverWarnings];
  await prisma.article.update({ where: { id: articleId }, data: { warnings } });
  return warnings;
}

/** Makes one of the stored candidates the cover. */
export async function chooseCover(articleId: number, imageId: number): Promise<void> {
  const img = await prisma.articleImage.findFirst({ where: { id: imageId, articleId } });
  if (!img) throw new Error('Cover candidate not found');
  await prisma.$transaction([
    prisma.articleImage.updateMany({ where: { articleId }, data: { chosen: false } }),
    prisma.articleImage.update({ where: { id: imageId }, data: { chosen: true } }),
    prisma.article.update({ where: { id: articleId }, data: { heroImage: img.image, heroImageType: img.imageType } }),
  ]);
}
