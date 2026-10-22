import { prisma } from '@/lib/db';

export type PageType = 'product' | 'comparison' | 'roundup';

export interface ProductFacts {
  name: string;
  brand: string;
  model: string;
  category: string;
  specs: { spec: string; value: string; unit?: string }[];
}

export interface FactSheet {
  pageType: PageType;
  products: ProductFacts[];
  roundup?: { title: string; useCase: string | null; picks: { rank: number; label: string | null; product: string }[] };
}

async function productFacts(productId: number): Promise<ProductFacts> {
  const p = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      category: { include: { specFields: { orderBy: { sortOrder: 'asc' } } } },
      specs: { where: { verifiedAt: { not: null } } },
    },
  });
  const order = new Map(p.category.specFields.map((f, i) => [f.key, i]));
  const labels = new Map(p.category.specFields.map((f) => [f.key, f]));
  const specs = [...p.specs].sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999))
    .map((s) => {
      const f = labels.get(s.key);
      return { spec: f?.label ?? s.key, value: s.value, ...(f?.unit && { unit: f.unit }) };
    });
  return { name: p.title, brand: p.brand, model: p.model, category: p.category.name, specs };
}

export async function buildFactSheet(pageType: PageType, pageKey: string): Promise<FactSheet> {
  if (pageType === 'product') {
    const p = await prisma.product.findUniqueOrThrow({ where: { slug: pageKey } });
    return { pageType, products: [await productFacts(p.id)] };
  }
  if (pageType === 'comparison') {
    const c = await prisma.comparison.findUniqueOrThrow({ where: { slug: pageKey } });
    return { pageType, products: [await productFacts(c.productAId), await productFacts(c.productBId)] };
  }
  const r = await prisma.roundup.findUniqueOrThrow({
    where: { slug: pageKey },
    include: { items: { orderBy: { rank: 'asc' }, include: { product: true } } },
  });
  return {
    pageType,
    products: await Promise.all(r.items.map((i) => productFacts(i.productId))),
    roundup: {
      title: r.title,
      useCase: r.useCase,
      picks: r.items.map((i) => ({ rank: i.rank, label: i.label, product: i.product.title })),
    },
  };
}

export function factSheetProblems(f: FactSheet): string[] {
  const problems: string[] = [];
  if (f.products.length === 0) problems.push('No products');
  if (f.pageType === 'comparison' && f.products.length !== 2) problems.push('A comparison needs exactly 2 products');
  if (f.pageType === 'roundup' && f.products.length < 2) problems.push('A roundup needs at least 2 products');
  for (const p of f.products) {
    if (p.specs.length < 2) problems.push(`${p.name}: fewer than 2 verified specs`);
  }
  return problems;
}
