import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 });

  const imageParam = new URL(req.url).searchParams.get('image');
  let bytes: Uint8Array | null = null;
  let type: string | null = null;
  if (imageParam) {
    const imageId = Number(imageParam);
    if (!Number.isInteger(imageId)) return new Response('Not found', { status: 404 });
    const img = await prisma.articleImage.findFirst({ where: { id: imageId, articleId: id }, select: { image: true, imageType: true } });
    bytes = img?.image ?? null;
    type = img?.imageType ?? null;
  } else {
    const a = await prisma.article.findUnique({ where: { id }, select: { heroImage: true, heroImageType: true } });
    bytes = a?.heroImage ?? null;
    type = a?.heroImageType ?? null;
  }
  if (!bytes || !type) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
