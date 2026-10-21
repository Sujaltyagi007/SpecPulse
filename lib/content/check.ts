import type { FactSheet } from '@/lib/content/facts';
import type { PageCopy } from '@/lib/content/prompt';

const NUMBER = /\d+(?:[.,]\d+)?/g;

function numbersIn(text: string): Set<string> {
  return new Set([...text.matchAll(NUMBER)].map((m) => m[0].replace(',', '.')));
}

export function checkCopy(copy: PageCopy, facts: FactSheet): string[] {
  const errors: string[] = [];
  const allText = [copy.summary, copy.body, ...copy.faq.flatMap((f) => [f.question, f.answer])].join('\n');
  const allowed = numbersIn(JSON.stringify(facts));
  facts.roundup?.picks.forEach((p) => allowed.add(String(p.rank)));
  const unknown = [...numbersIn(allText)].filter((n) => !allowed.has(n));
  if (unknown.length) errors.push(`Numbers not in the verified facts: ${unknown.join(', ')}`);

  if (/[$€£₹¥]|\b(USD|EUR|GBP|INR)\b/.test(allText)) errors.push('Mentions a price or currency');
  if (/https?:\/\/|www\./i.test(allText)) errors.push('Contains a URL');
  if (/\b(we|I)\s+(tested|test|measured|tried|used|wore|reviewed)\b|\b(our|my)\s+(testing|tests|experience)\b|\bhands-on\b/i.test(allText)) {
    errors.push('Claims hands-on testing or personal experience');
  }
  if (/^\s*(#{1,6}\s|[-*]\s|\d+\.\s)/m.test(allText)) errors.push('Uses markdown headings or lists');

  if (copy.summary.length < 40) errors.push('Summary is too short');
  if (copy.summary.length > 400) errors.push('Summary is longer than 400 characters');
  if (copy.body.length < 300) errors.push('Body is too short');
  if (copy.body.length > 5000) errors.push('Body is longer than 5000 characters');
  if (copy.faq.length < 3 || copy.faq.length > 6) errors.push(`FAQ has ${copy.faq.length} items (want 3 to 6)`);
  if (copy.faq.some((f) => !f.question.trim() || !f.answer.trim())) errors.push('FAQ has an empty question or answer');

  return errors;
}
