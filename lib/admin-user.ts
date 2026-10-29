import { prisma } from '@/lib/db';
import { parseTheme } from '@/lib/admin-theme';
import { getAdminAuth } from '@/lib/auth-guard';

export async function currentUsername(): Promise<string> {
  const authContext = await getAdminAuth();
  if (authContext.authenticated && authContext.user?.username) {
    return authContext.user.username;
  }
  return process.env.ADMIN_USER ?? 'SuperAdmin';
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
    role: row?.role ?? 'Administrator',
    avatar: row?.avatar ?? null,
    theme: parseTheme(row?.theme),
  };
}
