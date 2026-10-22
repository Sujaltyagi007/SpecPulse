import type { Metadata } from 'next';
import { resolveSetting, settingDefs } from '@/lib/settings';
import { IntegrationsClient, type SettingRow } from './integrations-client';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'AI & API keys' };

/** Shows only the first few and last four characters of a key, e.g. "sk-pr…a1B2". */
function mask(v: string): string {
  return v.length <= 10 ? '••••' : `${v.slice(0, 5)}…${v.slice(-4)}`;
}

export default async function IntegrationsPage() {
  const rows: SettingRow[] = await Promise.all(
    (await settingDefs()).map(async (def) => {
      const { value, source } = await resolveSetting(def.key);
      const secret = def.kind === 'secret';
      return {
        ...def,
        source,
        // Secrets never leave the server: the client gets a masked hint only.
        value: secret ? '' : (value ?? ''),
        masked: secret && value ? mask(value) : null,
        defaultValue: def.fallback ?? null,
      };
    }),
  );
  return <IntegrationsClient rows={rows} />;
}
