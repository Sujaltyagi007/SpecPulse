import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME, parseTheme, readableOn, themeAttributes, themeStyle } from '@/lib/admin-theme';

test('parseTheme keeps valid fields and defaults the rest', () => {
  const t = parseTheme({ temperature: 'warm', accent: 'not-a-color', button: '#112233', radius: 'huge', extra: 1 });
  assert.equal(t.temperature, 'warm');
  assert.equal(t.accent, DEFAULT_THEME.accent);
  assert.equal(t.button, '#112233');
  assert.equal(t.radius, DEFAULT_THEME.radius);
  assert.deepEqual(parseTheme(null), DEFAULT_THEME);
  assert.deepEqual(parseTheme('garbage'), DEFAULT_THEME);
});

test('themeStyle only overrides what the user customised', () => {
  const neutral = themeStyle(DEFAULT_THEME) as Record<string, string>;
  assert.equal(neutral['--admin-accent'], '#3b82f6');
  assert.equal(neutral['--admin-primary'], undefined, 'neutral buttons follow the palette');
  assert.equal(neutral['--admin-border'], undefined, 'default border follows the palette');
  const custom = themeStyle({ ...DEFAULT_THEME, button: 'accent', accent: '#fde047', border: '#ff0000', radius: 'sharp' }) as Record<string, string>;
  assert.equal(custom['--admin-primary'], '#fde047');
  assert.equal(custom['--admin-primary-fg'], '#0f172a', 'dark text on a light yellow button');
  assert.equal(custom['--admin-border'], '#ff0000');
  assert.equal(custom['--admin-radius'], '4px');
});

test('readable text color', () => {
  assert.equal(readableOn('#ffffff'), '#0f172a');
  assert.equal(readableOn('#0f172a'), '#ffffff');
  assert.equal(readableOn('#3b82f6'), '#ffffff');
});

test('attributes', () => {
  assert.deepEqual(themeAttributes({ ...DEFAULT_THEME, temperature: 'neutral', density: 'compact' }), {
    'data-temp': 'neutral',
    'data-mode': 'system',
    'data-density': 'compact',
  });
});
