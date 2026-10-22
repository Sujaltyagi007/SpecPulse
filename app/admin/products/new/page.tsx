import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PackagePlus } from 'lucide-react';
import { createProduct } from '../../actions';
import { ActionError } from '@/components/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/card';

export const dynamic = 'force-dynamic';

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="py-6 pb-12 max-w-xl flex flex-col gap-6">
      <nav className="admin-breadcrumb flex items-center gap-1.5 text-xs text-admin-muted">
        <Link href="/admin" className="hover:text-admin-fg transition-colors">Console</Link>
        <span className="text-admin-muted/60">/</span>
        <Link href="/admin?tab=products" className="hover:text-admin-fg transition-colors">Products</Link>
        <span className="text-admin-muted/60">/</span>
        <span className="text-admin-fg font-medium">New</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-admin-fg m-0">Add a product</h1>
        <p className="text-sm text-admin-muted mt-1">Create a new product draft to verify specifications and track pricing.</p>
      </div>

      <ActionError message={error} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PackagePlus size={18} className="text-admin-accent" /> Basic details
            </CardTitle>
            <CardDescription className="mt-1">
              It starts as a draft. Next you&apos;ll add and verify its specs, then use &quot;Find prices now&quot; to pull retailer
              prices. Nothing goes live until it passes the checks and you approve it.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={createProduct} className="grid gap-5">
            <div className="admin-form-group flex flex-col gap-1.5">
              <label className="admin-label font-medium text-xs text-admin-fg" htmlFor="categoryId">Category</label>
              <select id="categoryId" name="categoryId" className="admin-select w-full" required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="admin-form-group flex flex-col gap-1.5">
                <label className="admin-label font-medium text-xs text-admin-fg" htmlFor="brand">Brand</label>
                <input id="brand" name="brand" className="admin-input w-full" required placeholder="Sony" />
              </div>
              <div className="admin-form-group flex flex-col gap-1.5">
                <label className="admin-label font-medium text-xs text-admin-fg" htmlFor="model">Model</label>
                <input id="model" name="model" className="admin-input w-full" required placeholder="WF-1000XM5" />
                <span className="admin-form-hint text-[11px] text-admin-muted leading-tight mt-0.5">
                  Include generation number (&quot;AirPods Pro 2&quot;), or price matching may pick up the wrong model.
                </span>
              </div>
            </div>

            <div className="admin-form-group flex flex-col gap-1.5">
              <label className="admin-label font-medium text-xs text-admin-fg" htmlFor="title">Page title (optional)</label>
              <input id="title" name="title" className="admin-input w-full" placeholder="Defaults to brand + model" />
            </div>

            <div className="admin-form-group flex flex-col gap-1.5">
              <label className="admin-label font-medium text-xs text-admin-fg" htmlFor="gtin">GTIN / UPC / EAN (optional)</label>
              <input id="gtin" name="gtin" className="admin-input w-full" inputMode="numeric" placeholder="Barcode number from the box or retailer listing" />
              <span className="admin-form-hint text-[11px] text-admin-muted leading-tight mt-0.5">
                Needed before the product can go live; you can add it later.
              </span>
            </div>

            <div className="pt-2">
              <button className="admin-btn admin-btn-primary px-4 py-2 font-medium">Create draft</button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
