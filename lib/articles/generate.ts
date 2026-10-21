import { prisma } from '@/lib/db';
import { checkArticle } from '@/lib/articles/check';
import { generateCoverImage } from '@/lib/articles/image';
import { canResearchWeb, generateJson, webResearch, type ResearchSource } from '@/lib/llm/pool';
import { ARTICLE_PROMPT_VERSION, ArticleDraft, RESEARCH_SYSTEM, TOPIC_SYSTEM, TopicChoice, WRITER_SYSTEM } from '@/lib/articles/prompt';

export const ARTICLE_STEPS = ['topic', 'research', 'writing', 'image', 'checks'] as const;
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

export async function runArticleJob(articleId: number): Promise<void> {
  const step = (progress: ArticleStep) => prisma.article.update({ where: { id: articleId }, data: { progress } });
  try {
    let article = await prisma.article.findUniqueOrThrow({ where: { id: articleId } });
    const catalog = await catalogContext();
    const catalogText = JSON.stringify(catalog.map(({ id: _id, ...rest }) => rest), null, 1);

    if (!article.topic.trim()) {
      await step('topic');
      const existing = await prisma.article.findMany({ where: { id: { not: articleId }, title: { not: null } }, select: { title: true }, take: 100 });
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data } = await generateJson({
        purpose: 'article:topic',
        system: TOPIC_SYSTEM,
        user: `TODAY'S DATE: ${todayIso}
        CATALOG (verified by SpecPulse editors):
        ${catalogText}
        EXISTING ARTICLES (do not duplicate):
        ${existing.map((e) => `- ${e.title}`).join('\n') || '(none)'}
        Find the single highest-scoring, winnable tech content opportunity with clear buying or comparison intent that drives affiliate revenue.`,
        schema: TopicChoice,
      });
      article = await prisma.article.update({ where: { id: articleId }, data: { topic: data.topic.trim() } });
    }

    await step('research');
    const researched = canResearchWeb();
    let notes = '';
    let sources: ResearchSource[] = [];
    if (researched) {
      const r = await webResearch({
        purpose: 'article:research',
        system: RESEARCH_SYSTEM,
        user: `Topic: ${article.topic}\n\nSpecPulse covers these products (for context; research the topic broadly):\n${catalog.map((p) => `- ${p.name} (${p.category})`).join('\n') || '(none yet)'}`,
      });
      notes = r.notes;
      sources = r.sources.slice(0, 20);
    }

    await step('writing');
    const { data: draft, provider, model } = await generateJson({
      purpose: 'article:write',
      system: WRITER_SYSTEM,
      user: `TOPIC: ${article.topic}
      CATALOG (verified by SpecPulse editors): ${catalogText}
      RESEARCH NOTES:  ${notes || '(No web research available. Write only what the catalog supports and keep general claims cautious.)'}
      SOURCES:      ${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join('\n') || '(none)'}`, schema: ArticleDraft,
    });

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
    const image = await generateCoverImage(draft.imagePrompt, draft.title);
    await step('checks');
    const { errors, warnings } = checkArticle({
      title: draft.title,
      summary: draft.summary,
      bodyMd,
      faq: draft.faq,
      sourceCount: sources.length,
      researched,
    });
    if (image.fallbackReason) warnings.push(`Cover is a generated graphic (${image.fallbackReason})`);
    await prisma.article.update({
      where: { id: articleId },
      data: {
        heroImage: image.bytes,
        heroImageType: image.type,
        validationErrors: errors,
        warnings,
        status: 'review',
        progress: null,
        error: null,
      },
    });
  } catch (err) {
    await prisma.article.update({
      where: { id: articleId },
      data: { status: 'failed', progress: null, error: (err instanceof Error ? err.message : String(err)).slice(0, 2000) },
    }).catch(() => { });
  }
}

export async function regenerateCover(articleId: number): Promise<string[]> {
  const a = await prisma.article.findUniqueOrThrow({ where: { id: articleId } });
  const image = await generateCoverImage(a.imagePrompt ?? a.title ?? a.topic, a.title ?? a.topic);
  const warnings = ((a.warnings as string[]) ?? []).filter((w) => !w.startsWith('Cover is a generated graphic'));
  if (image.fallbackReason) warnings.push(`Cover is a generated graphic (${image.fallbackReason})`);
  await prisma.article.update({ where: { id: articleId }, data: { heroImage: image.bytes, heroImageType: image.type, warnings } });
  return warnings;
}
