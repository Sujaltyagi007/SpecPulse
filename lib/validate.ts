import { prisma } from '@/lib/db';
import { isValidGtin } from '@/lib/gtin';
import { OFFER_STALE_HOURS, staleCutoff } from '@/lib/offers';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export async function validateProduct(productId: number): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      specs: true,
      category: { include: { specFields: { orderBy: { sortOrder: 'asc' } } } },
      offers: { include: { retailer: { include: { affiliateProgram: true } } } },
    },
  });
  if (!product) return { errors: ['Product not found'], warnings };

  if (!product.gtin) errors.push('Missing GTIN');
  else if (!isValidGtin(product.gtin)) errors.push(`GTIN ${product.gtin} fails checksum`);

  const specs = new Map(product.specs.map((s) => [s.key, s]));
  for (const field of product.category.specFields) {
    const spec = specs.get(field.key);
    const missing = !spec || spec.value.trim() === '';
    if (field.required && missing) errors.push(`Missing required spec: ${field.label}`);
    else if (field.required && !spec?.verifiedAt) errors.push(`Spec not human-verified: ${field.label}`);
    else if (!missing && !spec?.verifiedAt) warnings.push(`Optional spec not verified: ${field.label}`);
  }

  const priced = product.offers.filter((o) => o.priceCents != null);
  const cutoff = staleCutoff();
  if (priced.length === 0) errors.push('No priced offers');
  else if (!priced.some((o) => o.lastSeenAt >= cutoff)) errors.push(`All prices older than ${OFFER_STALE_HOURS}h`);
  if (!product.offers.some((o) => o.retailer.affiliateProgram?.active)) {
    warnings.push('No offer has an active affiliate program (page will earn nothing)');
  }

  return { errors, warnings };
}
