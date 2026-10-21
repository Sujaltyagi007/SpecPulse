'use client';

import { THEME_SCRIPT } from './theme';

/**
 * Emitted only in the server HTML, where it runs before paint. On the client it renders nothing, so React never
 * creates a <script> it can't execute (React 19 skips the extra <head> tag during hydration).
 */
export function ThemeScript() {
  if (typeof window !== 'undefined') return null;
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
