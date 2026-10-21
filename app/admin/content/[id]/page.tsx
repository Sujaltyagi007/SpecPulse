import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { buildFactSheet } from '@/lib/content/facts';
import { ContentEditorClient } from './content-editor-client';

export const dynamic = 'force-dynamic';

export default async function ContentEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const { error } = await searchParams;
  const row = await prisma.pageContent.findUnique({ where: { id } });
  if (!row) notFound();
  const facts = await buildFactSheet(row.pageType, row.pageKey);

  return <ContentEditorClient row={row} facts={facts} error={error} />;
}
