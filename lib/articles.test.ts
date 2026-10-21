import { test } from 'node:test';
import { createElement } from 'react';
import assert from 'node:assert/strict';
import { svgCover } from '@/lib/articles/image';
import { checkArticle } from '@/lib/articles/check';
import { ArticleBody } from '@/lib/articles/markdown';
import { renderToStaticMarkup } from 'react-dom/server';

const body = [
  '## Why it matters',
  'Active noise cancelling reduces low-frequency sound such as engine hum [1]. It is less effective on voices [2].',
  '## What to look for',
  '- **Battery life** with ANC on, since it uses more power [1]\n- Fit, because a good seal helps passive isolation [2]',
  '## Bottom line',
  'Prioritise fit first, then ANC strength. ' + 'More detail on choosing earbuds for travel. '.repeat(14),
].join('\n\n');

const good = {
  title: 'How to choose noise-cancelling earbuds for flights',
  summary: 'Pick earbuds that seal well in your ears first, then compare ANC strength and battery life with ANC switched on.',
  bodyMd: body,
  faq: [
    { question: 'Does ANC block voices?', answer: 'Less well than engine noise.' },
    { question: 'Does ANC drain the battery?', answer: 'Yes, battery life is lower with it on.' },
    { question: 'Does fit matter?', answer: 'Yes, a good seal improves isolation.' },
  ],
  sourceCount: 2,
  researched: true,
};

test('a clean, cited article passes', () => {
  assert.deepEqual(checkArticle(good), { errors: [], warnings: [] });
});

test('catches testing claims, prices, raw URLs and phantom citations', () => {
  const errs = (patch: Partial<typeof good>) => checkArticle({ ...good, ...patch }).errors.join(' | ');
  assert.match(errs({ summary: 'We tested these on a long-haul flight and loved the quiet.' }), /testing/);
  assert.match(errs({ summary: 'At $249 these are the best value for anyone flying often.' }), /price/);
  assert.match(errs({ bodyMd: body + '\n\nSee https://example.com for more.' }), /URL/);
  assert.match(errs({ bodyMd: body + '\n\nAnother claim [7].' }), /\[7\]/);
  assert.match(errs({ bodyMd: '## Only one\n\nShort.' }), /3 sections/);
});

test('warns when there was no web research', () => {
  const { errors, warnings } = checkArticle({ ...good, sourceCount: 0, researched: false, bodyMd: body.replace(/\s\[\d\]/g, '') });
  assert.deepEqual(errors, []);
  assert.match(warnings.join(), /No web research/);
});

test('markdown renders headings, lists, bold and only valid citations, never raw HTML', () => {
  const html = renderToStaticMarkup(
    createElement(ArticleBody, {
      markdown: '## Title\n\nText with **bold** [1] and a fake [9].\n\n- one\n- two\n\n<script>alert(1)</script> [link](https://evil.example)',
      sourceCount: 2,
    }),
  );
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="#source-1"/);
  assert.doesNotMatch(html, /#source-9/, 'out-of-range citation is plain text');
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.doesNotMatch(html, /<script>/, 'HTML is escaped');
  assert.doesNotMatch(html, /href="https:\/\/evil/, 'markdown links are not rendered as links');
});

test('SVG cover escapes the title and is deterministic', () => {
  const a = svgCover('Earbuds <script> & "quotes"');
  const svg = Buffer.from(a.bytes).toString('utf8');
  assert.equal(a.type, 'image/svg+xml');
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt; &amp;/);
  assert.equal(Buffer.from(svgCover('Same title').bytes).toString(), Buffer.from(svgCover('Same title').bytes).toString());
});
