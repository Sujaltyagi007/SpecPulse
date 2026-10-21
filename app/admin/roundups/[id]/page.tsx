import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { RoundupEditorClient } from './roundup-editor-client';
export const dynamic = 'force-dynamic';

export default async function RoundupEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }>; }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const { error } = await searchParams;

  const roundup = await prisma.roundup.findUnique({
    where: { id },
    include: {
      category: true,
      items: { orderBy: { rank: 'asc' }, include: { product: true } },
    },
  });
  if (!roundup) notFound();

  const [candidates, copy] = await Promise.all([
    prisma.product.findMany({
      where: { categoryId: roundup.categoryId, status: { not: 'archived' } },
      orderBy: { title: 'asc' },
    }),
    prisma.pageContent.findUnique({
      where: { pageType_pageKey: { pageType: 'roundup', pageKey: roundup.slug } },
    }),
  ]);

  return (
    <RoundupEditorClient
      roundup={roundup}
      candidates={candidates}
      copy={copy}
      error={error}
    />
  );
}
