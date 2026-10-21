export interface ArticleCheckInput {
  title: string;
  summary: string;
  bodyMd: string;
  faq: { question: string; answer: string }[];
  sourceCount: number;
  researched: boolean;
}

export function checkArticle(a: ArticleCheckInput): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const all = [a.title, a.summary, a.bodyMd, ...a.faq.flatMap((f) => [f.question, f.answer])].join('\n');

  if (/\b(we|I)\s+(tested|test|measured|tried|used|wore|reviewed)\b|\b(our|my)\s+(testing|tests|experience)\b|\bhands-on\b/i.test(all)) { errors.push('Claims hands-on testing or personal experience'); }
  if (/[$€£₹¥]\s?\d|\b\d+(\.\d+)?\s?(USD|EUR|GBP|INR)\b/.test(all)) errors.push('Mentions a specific price');
  if (/https?:\/\/|www\./i.test(a.bodyMd)) errors.push('Body contains a raw URL (cite sources as [n] instead)');
  const cited = [...a.bodyMd.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const bad = [...new Set(cited.filter((n) => n < 1 || n > a.sourceCount))];
  if (bad.length) errors.push(`Cites sources that don't exist: ${bad.map((n) => `[${n}]`).join(', ')}`);
  if (a.title.length < 10 || a.title.length > 110) errors.push('Title should be 10 to 110 characters');
  if (a.summary.length < 40) errors.push('Summary is too short');
  if (a.summary.length > 500) errors.push('Summary is longer than 500 characters');
  const headings = (a.bodyMd.match(/^##\s+/gm) ?? []).length;
  if (headings < 3) errors.push('Needs at least 3 sections');
  if (a.bodyMd.length < 800) errors.push('Body is too short');
  if (a.bodyMd.length > 20000) errors.push('Body is longer than 20,000 characters');
  if (a.faq.length < 3 || a.faq.length > 6) errors.push(`FAQ has ${a.faq.length} items (want 3 to 6)`);
  if (!a.researched) warnings.push('No web research was done (no Anthropic model in the pool): every claim comes from the AI and the catalog only');
  else if (a.sourceCount < 2) warnings.push('Fewer than 2 sources were found');
  if (a.researched && cited.length === 0) warnings.push('The body cites no sources');
  return { errors, warnings };
}
