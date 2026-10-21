'use server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { AdminTheme } from '@/lib/admin-theme';
import { currentUsername } from '@/lib/admin-user';

const MAX_AVATAR_BYTES = 200_000;

const ProfileInput = z.object({
  displayName: z.string().trim().min(1, 'Name is required').max(60),
  role: z.string().trim().max(60).optional(),
  avatar: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Avatar must be a PNG, JPEG or WebP image')
    .max(MAX_AVATAR_BYTES, 'Avatar is too large')
    .nullable()
    .optional(),
});

export async function saveProfile(input: z.input<typeof ProfileInput>) {
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid profile' };
  const username = await currentUsername();
  const { displayName, role, avatar } = parsed.data;
  const data = { displayName, role: role || null, ...(avatar !== undefined && { avatar }) };
  await prisma.adminProfile.upsert({ where: { username }, create: { username, ...data }, update: data });
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function saveTheme(input: unknown) {
  const parsed = AdminTheme.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid theme' };
  const username = await currentUsername();
  await prisma.adminProfile.upsert({
    where: { username },
    create: { username, theme: parsed.data },
    update: { theme: parsed.data },
  });
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
