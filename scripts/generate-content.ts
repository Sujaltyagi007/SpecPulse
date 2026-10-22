import 'dotenv/config';
import { prisma } from '@/lib/db';
import type { PageType } from '@/lib/content/facts';
import { generatePageContent } from '@/lib/content/generate';

const [mode, arg] = process.argv.slice(2);

async function one(pageType: PageType, pageKey: string) {
  try {
    const r = await generatePageContent(pageType, pageKey);
    console.log(`${r.status === 'review' ? 'ok  ' : 'FAIL'} ${pageType}/${pageKey} -> ${r.status} (${r.generator})`);
    for (const e of r.errors) console.log(`       ${e}`);
  } catch (err) {
    console.log(`ERR  ${pageType}/${pageKey}: ${(err as Error).message}`);
  }
}

try {
  if (mode === 'product' || mode === 'comparison' || mode === 'roundup') {
    if (!arg) throw new Error(`Usage: content:generate ${mode} <slug>`);
    await one(mode, arg);
  } else if (mode === 'missing') {
    const limit = Number(arg ?? 10);
    const haveCopy = new Set((await prisma.pageContent.findMany({ where: { pageType: 'product' }, select: { pageKey: true } })).map((c) => c.pageKey));
    const products = await prisma.product.findMany({
      where: { status: { in: ['review', 'approved', 'published'] } },
      orderBy: { updatedAt: 'asc' },
    });
    const todo = products.filter((p) => !haveCopy.has(p.slug)).slice(0, limit);
    console.log(`${todo.length} products without copy (limit ${limit}).`);
    for (const p of todo) await one('product', p.slug);
  } else {
    console.log('Usage: content:generate <product|comparison|roundup> <slug> | content:generate missing [limit]');
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
