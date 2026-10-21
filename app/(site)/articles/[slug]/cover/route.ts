import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await prisma.article.findFirst({
    where: { slug, status: 'published' },
    select: { heroImage: true, heroImageType: true },
  });
  if (!a?.heroImage || !a.heroImageType) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(a.heroImage), {
    headers: {
      'Content-Type': a.heroImageType,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
