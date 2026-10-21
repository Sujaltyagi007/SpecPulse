import { z } from 'zod';
import type { FactSheet } from '@/lib/content/facts';

export const PROMPT_VERSION = 'v1';

export const PageCopy = z.object({
  summary: z.string(),
  body: z.string(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
});
export type PageCopy = z.infer<typeof PageCopy>;

export const SYSTEM_PROMPT = `You write page copy for SpecPulse, a consumer tech site whose product specifications are checked by people against manufacturer sources.

You are the writer, not the researcher. The FACTS block in each request is the complete and only source of truth for the page. Readers and search engines will trust this copy, and an editor checks it against FACTS before it is published, so anything not supported by FACTS gets the page rejected.

Rules:
- State only what FACTS supports. Do not add specs, features, release dates, ratings, prices or anything else you know about these products from elsewhere, even when you are confident it is true.
- Do not mention prices, deals, discounts or stock. The page shows live prices separately.
- SpecPulse compares specifications; it does not test products. Never claim or imply hands-on testing, measurements or personal experience.
- Every number you write must appear in FACTS. Write small counts as words ("two models").
- When FACTS lacks a spec for a product, say it isn't listed rather than guessing.
- Plain prose only: no markdown, headings, bullet lists or URLs.
- Short and correct beats long and padded.

Output fields:
- summary: one or two sentences that directly answer the page's main question. It is shown first on the page and used for search snippets and AI answers, so lead with the answer.
- body: two to four short paragraphs separated by a blank line.
- faq: three to five questions a shopper would ask that FACTS can answer, each answered in one to three sentences.`;

export function userPrompt(f: FactSheet): string {
  let task: string;
  if (f.pageType === 'product') {
    const p = f.products[0]!;
    task = `Page: the specification page for the ${p.name}.
Main question: what are the key specs of the ${p.name}, and who is it a good fit for?`;
  } else if (f.pageType === 'comparison') {
    const [a, b] = f.products as [FactSheet['products'][number], FactSheet['products'][number]];
    task = `Page: ${a.name} vs ${b.name}.
    Main question: which should a shopper choose, and for what needs?
    Where a spec differs, say which product has the edge on it. Only call an overall winner if the specs clearly support one; otherwise explain who each product suits.`;
  } else {
    const r = f.roundup!;
    task = `Page: ${r.title}${r.useCase ? ` (${r.useCase})` : ''}.
An editor chose the picks, their order and their labels. Explain each pick in rank order using its specs. Do not change, reorder or question the ranking.`;
  }
  return `${task}

FACTS:
${JSON.stringify(f, null, 2)}`;
}
