import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCopy } from '@/lib/content/check';
import type { FactSheet } from '@/lib/content/facts';
import { __test, type PoolEntry } from '@/lib/llm/pool';

const facts: FactSheet = {
  pageType: 'comparison',
  products: [
    { name: 'Sony WF-1000XM5', brand: 'Sony', model: 'WF-1000XM5', category: 'Wireless Earbuds', specs: [{ spec: 'Battery life (buds)', value: '8', unit: 'h' }, { spec: 'Bluetooth version', value: '5.3' }] },
    { name: 'Apple AirPods Pro 2 (USB-C)', brand: 'Apple', model: 'AirPods Pro 2 (USB-C)', category: 'Wireless Earbuds', specs: [{ spec: 'Battery life (buds)', value: '6', unit: 'h' }, { spec: 'Bluetooth version', value: '5.3' }] },
  ],
};

const body =
  'The Sony WF-1000XM5 lists 8 hours of battery life in the buds, against 6 hours for the AirPods Pro 2. ' +
  'Both use Bluetooth 5.3, so neither has an edge on connectivity on paper.\n\n' +
  'If battery life between charges matters most, the specs favour the Sony. Apple buyers who value ecosystem fit may still prefer the AirPods, though that is not something the listed specs measure.';

const good = {
  summary: 'The Sony WF-1000XM5 has the longer listed battery life (8 hours vs 6), while both share Bluetooth 5.3.',
  body,
  faq: [
    { question: 'Which has longer battery life?', answer: 'The Sony lists 8 hours in the buds; the AirPods Pro 2 list 6 hours.' },
    { question: 'Do they use the same Bluetooth version?', answer: 'Yes, both list Bluetooth 5.3.' },
    { question: 'Is one clearly better?', answer: 'Only on battery life, based on the listed specs.' },
  ],
};

test('clean copy passes', () => {
  assert.deepEqual(checkCopy(good, facts), []);
});

test('invented numbers are caught', () => {
  const errors = checkCopy({ ...good, summary: good.summary.replace('8 hours', '10 hours') }, facts);
  assert.ok(errors.some((e) => e.includes('10')), errors.join());
});

test('prices, URLs, testing claims and markdown are caught', () => {
  const cases: [string, string][] = [
    ['It costs $249 today and is worth every cent of it.', 'price'],
    ['See https://example.com for more details on this.', 'URL'],
    ['In our testing the Sony sounded warmer than the Apple.', 'testing'],
    ['## Battery\nThe Sony lasts longer than the Apple pair.', 'markdown'],
  ];
  for (const [summary, kind] of cases) {
    assert.ok(checkCopy({ ...good, summary }, facts).length > 0, `${kind} not caught`);
  }
});

test('FAQ size is enforced', () => {
  assert.ok(checkCopy({ ...good, faq: good.faq.slice(0, 2) }, facts).some((e) => e.includes('FAQ')));
});

test('pool order respects weights and benches failing slots', () => {
  const entry = (model: string, weight: number): PoolEntry => ({ provider: 'anthropic', model, keys: ['K'], weight, jsonMode: 'schema' });
  const heavy = { entry: entry('heavy', 9), keyName: 'K1', apiKey: 'x' };
  const light = { entry: entry('light', 1), keyName: 'K2', apiKey: 'y' };

  let heavyFirst = 0;
  for (let i = 0; i < 2000; i++) if (__test.orderSlots([heavy, light])[0] === heavy) heavyFirst++;
  assert.ok(heavyFirst > 1600 && heavyFirst < 1950, `heavy first ${heavyFirst}/2000`);

  __test.cooldownUntil.set('anthropic:heavy:K1', Date.now() + 60_000);
  for (let i = 0; i < 50; i++) assert.equal(__test.orderSlots([heavy, light])[0], light);
  __test.cooldownUntil.clear();
});

test('error classification', () => {
  assert.equal(__test.cooldownMs(new __test.OutputError('bad json')), 0);
  assert.equal(__test.cooldownMs({ status: 429 }), 60_000);
  assert.equal(__test.cooldownMs({ status: 401 }), 3_600_000);
  assert.equal(__test.cooldownMs(new Error('socket hang up')), 30_000);
});
