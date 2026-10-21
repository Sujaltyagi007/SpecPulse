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
    <div style={{ padding: '24px 0 48px', maxWidth: 640 }}>
      <nav className="admin-breadcrumb">
        <Link href="/admin?tab=products">Products</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <span>New</span>
      </nav>
      <h1 className="admin-page-title" style={{ marginBottom: 16 }}>Add a product</h1>
      <ActionError message={error} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PackagePlus size={17} style={{ color: 'var(--admin-accent)' }} /> Basic details
            </CardTitle>
            <CardDescription>
              It starts as a draft. Next you&apos;ll add and verify its specs, then use &quot;Find prices now&quot; to pull retailer
              prices. Nothing goes live until it passes the checks and you approve it.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={createProduct} style={{ display: 'grid', gap: 16 }}>
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="categoryId">Category</label>
              <select id="categoryId" name="categoryId" className="admin-select" required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="admin-form-group">
                <label className="admin-label" htmlFor="brand">Brand</label>
                <input id="brand" name="brand" className="admin-input" required placeholder="Sony" />
              </div>
              <div className="admin-form-group">
                <label className="admin-label" htmlFor="model">Model</label>
                <input id="model" name="model" className="admin-input" required placeholder="WF-1000XM5" />
                <span className="admin-form-hint">Include the generation number (&quot;AirPods Pro 2&quot;), or price matching may pick up the wrong model.</span>
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="title">Page title (optional)</label>
              <input id="title" name="title" className="admin-input" placeholder="Defaults to brand + model" />
            </div>
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="gtin">GTIN / UPC / EAN (optional)</label>
              <input id="gtin" name="gtin" className="admin-input" inputMode="numeric" placeholder="Barcode number from the box or retailer listing" />
              <span className="admin-form-hint">Needed before the product can go live; you can add it later.</span>
            </div>
            <div>
              <button className="admin-btn admin-btn-primary">Create draft</button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
