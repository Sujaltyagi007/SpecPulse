'use client';
import { THEME_SCRIPT } from './theme';

export function ThemeScript() {
  if (typeof window !== 'undefined') return null;
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
