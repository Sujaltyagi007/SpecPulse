import type { Metadata } from 'next';
import { SettingsClient } from './settings-client';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return <SettingsClient />;
}
