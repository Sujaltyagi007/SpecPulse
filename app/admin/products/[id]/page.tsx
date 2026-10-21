import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { validateProduct } from '@/lib/validate';
import { ProductEditorClient } from './product-editor-client';

export const dynamic = 'force-dynamic';

export default async function AdminProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const { error } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { include: { specFields: { orderBy: { sortOrder: 'asc' } } } },
      specs: true,
      offers: {
        include: { retailer: { include: { affiliateProgram: true } } },
        orderBy: { priceCents: 'asc' },
      },
    },
  });
  if (!product) notFound();

  const [validation, copy] = await Promise.all([
    validateProduct(id),
    prisma.pageContent.findUnique({
      where: { pageType_pageKey: { pageType: 'product', pageKey: product.slug } },
    }),
  ]);

  return (
    <ProductEditorClient product={product} validation={validation} copy={copy} error={error} />
  );
}
