import { prisma } from '@/lib/db';

// Admin preview of any article's cover (behind the /admin basic auth in proxy.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 });
  const a = await prisma.article.findUnique({ where: { id }, select: { heroImage: true, heroImageType: true } });
  if (!a?.heroImage || !a.heroImageType) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(a.heroImage), {
    headers: { 'Content-Type': a.heroImageType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
