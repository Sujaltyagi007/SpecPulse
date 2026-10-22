import { prisma } from '@/lib/db';
import { generateJson } from '@/lib/llm/pool';
import { checkCopy } from '@/lib/content/check';
import { buildFactSheet, factSheetProblems, type PageType } from '@/lib/content/facts';
import { PROMPT_VERSION, PageCopy, SYSTEM_PROMPT, userPrompt } from '@/lib/content/prompt';

export type ContentGenStep = 'facts' | 'llm' | 'checks' | 'saving';

export interface GenerateResult {
  id: number;
  status: 'draft' | 'review';
  errors: string[];
  generator: string;
}

export async function generatePageContent(pageType: PageType, pageKey: string, onStep?: (step: ContentGenStep, detail?: string) => void | Promise<void>): Promise<GenerateResult> {
  await onStep?.('facts', 'Loading verified specifications, retailer offers, and catalog facts...');
  const facts = await buildFactSheet(pageType, pageKey);
  const problems = factSheetProblems(facts);
  if (problems.length) throw new Error(`Not enough verified facts to write from: ${problems.join('; ')}`);
  await onStep?.('llm', 'Invoking AI model to draft summary, editorial body, and shopper FAQs...');
  const { data, provider, model } = await generateJson({
    purpose: `content:${pageType}`,
    system: SYSTEM_PROMPT,
    user: userPrompt(facts),
    schema: PageCopy,
  });

  await onStep?.('checks', 'Auditing drafted claims and numbers against verified ground-truth facts...');
  const errors = checkCopy(data, facts);
  const status = errors.length ? 'draft' : 'review';
  const generator = `${provider}:${model}`;
  const fields = {
    summary: data.summary.trim(),
    bodyMd: data.body.trim(),
    faq: data.faq,
    generator,
    promptVersion: PROMPT_VERSION,
    status,
    validationErrors: errors,
    reviewedBy: null,
    reviewedAt: null,
  } as const;

  await onStep?.('saving', 'Persisting verified editorial record to database...');
  const row = await prisma.pageContent.upsert({
    where: { pageType_pageKey: { pageType, pageKey } },
    create: { pageType, pageKey, ...fields },
    update: fields,
  });
  return { id: row.id, status, errors, generator };
}
