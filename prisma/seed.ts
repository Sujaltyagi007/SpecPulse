import 'dotenv/config';
import { prisma } from '@/lib/db';

const fields: { key: string; label: string; unit?: string; required?: boolean }[] = [
  { key: 'anc', label: 'Active noise cancelling', required: true },
  { key: 'battery_buds_h', label: 'Battery life (buds)', unit: 'h', required: true },
  { key: 'battery_case_h', label: 'Battery life (with case)', unit: 'h' },
  { key: 'bluetooth', label: 'Bluetooth version', required: true },
  { key: 'codecs', label: 'Codecs' },
  { key: 'water_resistance', label: 'Water resistance' },
  { key: 'wireless_charging', label: 'Wireless charging' },
  { key: 'weight_bud_g', label: 'Weight per bud', unit: 'g' },
];

const products = [
  { slug: 'sony-wf-1000xm5', brand: 'Sony', model: 'WF-1000XM5', title: 'Sony WF-1000XM5' },
  { slug: 'apple-airpods-pro-2-usb-c', brand: 'Apple', model: 'AirPods Pro 2 (USB-C)', title: 'Apple AirPods Pro 2 (USB-C)' },
];

try {
  const category = await prisma.category.upsert({
    where: { slug: 'wireless-earbuds' },
    create: { slug: 'wireless-earbuds', name: 'Wireless Earbuds' },
    update: {},
  });

  for (const [i, f] of fields.entries()) {
    const data = { label: f.label, unit: f.unit ?? null, required: f.required ?? false, sortOrder: i };
    await prisma.categorySpecField.upsert({
      where: { categoryId_key: { categoryId: category.id, key: f.key } },
      create: { categoryId: category.id, key: f.key, ...data },
      update: data,
    });
  }

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: { ...p, categoryId: category.id },
      update: {},
    });
  }

  const amazon = await prisma.retailer.upsert({
    where: { slug: 'amazon' },
    create: { slug: 'amazon', name: 'Amazon', domain: 'amazon.com' },
    update: {},
  });
  await prisma.affiliateProgram.upsert({
    where: { retailerId: amazon.id },
    create: {
      retailerId: amazon.id,
      network: 'amazon-associates',
      urlTemplate: 'https://www.amazon.com/dp/{external_id}?tag={tag}',
      tag: process.env.AMAZON_ASSOCIATE_TAG ?? null,
    },
    update: { tag: process.env.AMAZON_ASSOCIATE_TAG ?? null },
  });

  console.log(`Seeded "${category.name}" with ${fields.length} spec fields, ${products.length} products, Amazon affiliate program.`);
} finally {
  await prisma.$disconnect();
}
