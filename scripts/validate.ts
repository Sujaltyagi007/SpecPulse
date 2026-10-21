import 'dotenv/config';
import { prisma } from '@/lib/db';
import { validateProduct } from '@/lib/validate';

try {
  const products = await prisma.product.findMany({ where: { status: { not: 'archived' } }, orderBy: { id: 'asc' } });
  let failing = 0;
  for (const p of products) {
    const { errors, warnings } = await validateProduct(p.id);
    if (errors.length) failing++;
    console.log(`${errors.length ? 'FAIL' : 'ok  '} [${p.status}] ${p.slug}`);
    for (const e of errors) console.log(`       error: ${e}`);
    for (const w of warnings) console.log(`       warn:  ${w}`);
  }
  console.log(`\n${products.length} checked, ${failing} failing.`);
  process.exitCode = failing ? 1 : 0;
} finally {
  await prisma.$disconnect();
}
