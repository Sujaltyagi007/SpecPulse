// Humanise pass: a line edit for natural, readable prose. The edit is only kept if every fact survives it, because the
// writer's draft is the one that was grounded in the catalog and sources.
import { z } from 'zod';
import { generateJson } from '@/lib/llm/pool';
import { checkArticle } from '@/lib/articles/check';
import type { ArticleDraft } from '@/lib/articles/prompt';

export const HumanizedDraft = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
});
export type HumanizedDraft = z.infer<typeof HumanizedDraft>;

export const HUMANIZE_SYSTEM = `You are the line editor at SpecPulse, a consumer tech buying-guide site. You receive a finished, fact-checked draft. Make it read like a sharp human editor wrote it, for a shopper deciding what to buy. Change the wording, never the facts.

    WHAT TO IMPROVE
    - Rhythm: mix short and longer sentences. Break up runs of sentences that start the same way.
    - Voice: plain, direct, confident. Use contractions where natural ("it's", "doesn't"). Address the reader as "you" when giving advice.
    - Cut filler and stock phrases: "delve", "dive into", "in today's fast-paced world", "it's worth noting", "when it comes to", "in conclusion", "game-changer", "seamless", "robust", "elevate", "unlock", "navigate the landscape", "a testament to".
    - Cut throat-clearing openers and recap closers. Lead each section with the point.
    - Prefer concrete words to abstract ones. Keep paragraphs to 2-4 sentences.

    WHAT YOU MUST NOT CHANGE
    - Facts: every number, unit, model name, date and spec stays exactly as written. Do not add, remove, round or convert any figure.
    - Citations: keep every [n] marker attached to the claim it supports. Do not add, remove or renumber citations.
    - Method: never add first-person experience or testing ("I tried", "we tested", "in my experience", "hands-on"). SpecPulse compares specs; it does not test products.
    - No prices, deals or buy-now calls. No new claims, opinions or superlatives.
    - Structure: same number of sections in the same order, same number of FAQ items in the same order. Headings may be reworded.
    - Formatting rules from the draft: plain paragraphs, "- " lists and **bold** only; no headings, links, URLs, HTML or emoji inside bodies.

    Return the edited title, summary, sections and faq.`;

/** Numbers (with decimals) and [n] citations in a piece of text, sorted, so two versions can be compared as multisets. */
function facts(text: string): { numbers: string[]; citations: string[] } {
  const citations = [...text.matchAll(/\[(\d+)\]/g)].map((m) => m[1]!);
  const withoutCitations = text.replace(/\[\d+\]/g, ' ');
  const numbers = [...withoutCitations.matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0].replace(/,/g, ''));
  return { numbers: numbers.sort(), citations: citations.sort() };
}

const allText = (d: HumanizedDraft) => [d.title, d.summary, ...d.sections.flatMap((s) => [s.heading, s.body]), ...d.faq.flatMap((f) => [f.question, f.answer])].join('\n');
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const toMd = (d: HumanizedDraft) => d.sections.map((s) => `## ${s.heading.trim()}\n\n${s.body.trim()}`).join('\n\n');

/**
 * Why an edit must be rejected, or null when it is safe: same shape, every number and citation kept, and no check
 * error the original didn't already have.
 */
export function editRejection(original: HumanizedDraft, edited: HumanizedDraft, ctx: { sourceCount: number; researched: boolean }): string | null {
  if (edited.sections.length !== original.sections.length || edited.faq.length !== original.faq.length) {
    return 'it changed the number of sections or FAQ items';
  }
  const before = facts(allText(original));
  const after = facts(allText(edited));
  if (!same(before.numbers, after.numbers)) return 'it changed a number';
  if (!same(before.citations, after.citations)) return 'it changed the citations';

  const check = (d: HumanizedDraft) => checkArticle({ title: d.title, summary: d.summary, bodyMd: toMd(d), faq: d.faq, ...ctx }).errors;
  const newErrors = check(edited).filter((e) => !check(original).includes(e));
  return newErrors.length ? `it introduced check errors (${newErrors.join('; ')})` : null;
}

/**
 * Returns the edited draft when `editRejection` passes it. Otherwise returns the original with the reason, so the
 * pipeline can note it for the reviewer.
 */
export async function humanizeDraft(
  draft: ArticleDraft,
  ctx: { sourceCount: number; researched: boolean },
): Promise<{ draft: ArticleDraft; applied: boolean; reason?: string }> {
  const original: HumanizedDraft = { title: draft.title, summary: draft.summary, sections: draft.sections, faq: draft.faq };
  let edited: HumanizedDraft;
  try {
    ({ data: edited } = await generateJson({
      purpose: 'article:humanize',
      system: HUMANIZE_SYSTEM,
      user: `DRAFT (JSON):\n${JSON.stringify(original, null, 1)}`,
      schema: HumanizedDraft,
    }));
  } catch (err) {
    return { draft, applied: false, reason: `editor unavailable: ${(err instanceof Error ? err.message : String(err)).slice(0, 160)}` };
  }
  const rejection = editRejection(original, edited, ctx);
  return rejection ? { draft, applied: false, reason: rejection } : { draft: { ...draft, ...edited }, applied: true };
}
