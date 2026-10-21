import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { parseTheme } from '@/lib/admin-theme';

export async function currentUsername(): Promise<string> {
  const auth = (await headers()).get('authorization') ?? '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = atob(encoded);
    const sep = decoded.indexOf(':');
    if (sep > 0) return decoded.slice(0, sep);
  }
  return process.env.ADMIN_USER ?? 'admin';
}

export interface AdminProfileView {
  username: string;
  displayName: string;
  role: string | null;
  avatar: string | null;
  theme: ReturnType<typeof parseTheme>;
}

export async function currentProfile(): Promise<AdminProfileView> {
  const username = await currentUsername();
  const row = await prisma.adminProfile.findUnique({ where: { username } });
  return {
    username,
    displayName: row?.displayName || username,
    role: row?.role ?? null,
    avatar: row?.avatar ?? null,
    theme: parseTheme(row?.theme),
  };
}
