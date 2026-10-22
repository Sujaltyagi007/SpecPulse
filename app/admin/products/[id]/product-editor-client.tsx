'use client';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { ActionError, GenerateButton } from '@/components/admin';
import { formatDate, formatPrice, productPath } from '@/lib/site';
import { StatusBadge, IssueBadge } from '@/components/admin/badge';
import { ConfirmFormButton } from '@/components/admin/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';
import { Sliders, Tag, DollarSign, Sparkles, ExternalLink, Save, Rocket, RefreshCw, Trash2 } from 'lucide-react';
import { approveProduct, archiveProduct, deleteProduct, findPricesNow, publishNow, saveSpec, sendBackToDraft, submitForReview, updateIdentifiers } from '../../actions';

export function ProductEditorClient({ product, validation, copy, error }: { product: any; validation: { errors: string[]; warnings: string[] }; copy: any; error?: string; }) {
  const [activeTab, setActiveTab] = useState('specs');
  const { errors, warnings } = validation;

  const specs = new Map<string, any>(product.specs.map((s: any) => [s.key, s]));
  const knownKeys = new Set(product.category.specFields.map((f: any) => f.key));
  const extraSpecs = product.specs.filter((s: any) => !knownKeys.has(s.key));

  const allSpecFields = [
    ...product.category.specFields.map((f: any) => ({
      key: f.key,
      label: f.label,
      unit: f.unit,
      required: f.required,
    })),
    ...extraSpecs.map((s: any) => ({
      key: s.key,
      label: s.key,
      unit: null,
      required: false,
    })),
  ];

  return (
    <div className="pb-12 max-w-7xl mx-auto flex flex-col gap-6">
      <nav className="admin-breadcrumb flex items-center gap-1.5 text-xs text-admin-muted">
        <Link href="/admin" className="hover:text-admin-fg transition-colors">Console</Link>
        <span className="text-admin-muted/60">/</span>
        <Link href="/admin?tab=products" className="hover:text-admin-fg transition-colors">Products</Link>
        <span className="text-admin-muted/60">/</span>
        <span className="text-admin-fg font-medium">{product.category.name}</span>
      </nav>

      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-admin-border-subtle">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-admin-fg m-0">{product.title}</h1>
            <StatusBadge status={product.status} />
            <IssueBadge errors={errors.length} warnings={warnings.length} />
          </div>

          <div className="text-xs text-admin-muted flex flex-wrap items-center gap-2">
            <span>Category: {product.category.name}</span>
            <span>·</span>
            <span className="font-mono">Slug: {product.slug}</span>
            {product.status === 'published' && (
              <Fragment>
                <span>·</span>
                <Link href={productPath(product.category.slug, product.slug)} target="_blank" className="text-admin-accent inline-flex items-center gap-1 hover:underline">
                  View live page <ExternalLink size={11} />
                </Link>
              </Fragment>
            )}
          </div>
        </div>
        <div className="admin-header-actions flex items-center gap-2 shrink-0">
          <form className="flex items-center gap-2">
            <input type="hidden" name="productId" value={product.id} />
            {product.status === 'draft' && (
              <ConfirmFormButton
                className="admin-btn admin-btn-primary"
                disabled={errors.length > 0}
                dialogTitle="Submit Product for Review?"
                dialogDescription={`Submit "${product.title}" for editorial review? Make sure required specs and pricing are verified.`}
                confirmText="Submit for Review"
                formAction={submitForReview}
              >
                Send to Review
              </ConfirmFormButton>
            )}

            {product.status === 'review' && (
              <Fragment>
                <ConfirmFormButton
                  className="admin-btn admin-btn-primary"
                  disabled={errors.length > 0}
                  dialogTitle="Approve Product?"
                  dialogDescription={`Approve "${product.title}"? It will be scheduled for daily publishing.`}
                  confirmText="Approve Product"
                  formAction={approveProduct}
                >
                  Approve Product
                </ConfirmFormButton>

                <ConfirmFormButton
                  className="admin-btn admin-btn-outline"
                  dialogTitle="Return to Draft?"
                  dialogDescription={`Return "${product.title}" to draft status for corrections?`}
                  confirmText="Send to Draft"
                  tone="destructive"
                  formAction={sendBackToDraft}
                >
                  Back to Draft
                </ConfirmFormButton>
              </Fragment>
            )}

            {product.status === 'approved' && (
              <ConfirmFormButton
                className="admin-btn admin-btn-outline"
                dialogTitle="Return to Draft?"
                dialogDescription={`Return approved product "${product.title}" back to draft?`}
                confirmText="Send to Draft"
                tone="destructive"
                formAction={sendBackToDraft}
              >
                Back to Draft
              </ConfirmFormButton>
            )}

            {(product.status === 'review' || product.status === 'approved') && (
              <ConfirmFormButton
                className="admin-btn admin-btn-primary"
                disabled={errors.length > 0}
                dialogTitle="Publish now?"
                dialogDescription={`"${product.title}" goes live immediately instead of waiting for the daily publishing run. Approved page copy is published with it.`}
                confirmText="Publish now"
                formAction={publishNow}
              >
                <Rocket size={14} />
                Publish now
              </ConfirmFormButton>
            )}

            {product.status === 'published' && (
              <ConfirmFormButton
                className="admin-btn admin-btn-ghost text-admin-destructive hover:bg-admin-destructive-subtle"
                dialogTitle="Unpublish & Archive Product?"
                dialogDescription={`Unpublish "${product.title}"? The public page will be removed from the site.`}
                confirmText="Unpublish"
                tone="destructive"
                formAction={archiveProduct}
              >
                Unpublish
              </ConfirmFormButton>
            )}
          </form>
        </div>
      </div>

      <ActionError message={error} />

      {(errors.length > 0 || warnings.length > 0) && (
        <div className={`p-4 rounded-admin-lg border ${
          errors.length > 0 ? 'bg-admin-destructive-subtle border-admin-destructive-border' : 'bg-admin-warn-subtle border-admin-warn-border'
        }`}>
          <div className={`font-semibold text-xs mb-1.5 ${errors.length > 0 ? 'text-admin-destructive' : 'text-admin-warn'}`}>
            {errors.length > 0 ? 'Validation Requirements Pending' : 'Editorial Warnings'}
          </div>
          <ul className="m-0 pl-5 text-xs leading-relaxed space-y-1">
            {errors.map((e, idx) => (
              <li key={idx} className="text-admin-destructive font-medium">
                {e}
              </li>
            ))}
            {warnings.map((w, idx) => (
              <li key={idx} className="text-admin-warn font-medium">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="specs" icon={<Sliders size={14} />}>
            Specs & Verification
          </TabsTrigger>
          <TabsTrigger value="identifiers" icon={<Tag size={14} />}>
            Identifiers & Images
          </TabsTrigger>
          <TabsTrigger value="offers" icon={<DollarSign size={14} />} badge={product.offers.length}>
            Offers & Pricing
          </TabsTrigger>
          <TabsTrigger value="copy" icon={<Sparkles size={14} />}>
            Page Copy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="specs">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Category Specifications</CardTitle>
                <CardDescription>
                  Tick "verified" only after checking the value against the official manufacturer sheet. Editing a value
                  clears previous verification. Leave value empty to remove.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent noPadding>
              <div className="admin-table-container w-full overflow-x-auto">
                <table className="admin-table w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-admin-border-subtle">
                      <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Specification Field</th>
                      <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Value</th>
                      <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Source Verification URL</th>
                      <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider w-[120px]">Verified</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs text-admin-muted uppercase tracking-wider w-[100px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border-subtle">
                    {allSpecFields.map((f: any) => {
                      const s = specs.get(f.key);
                      const formId = `spec-${f.key}`;
                      return (
                        <tr key={f.key} className="hover:bg-admin-muted-bg/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-sm text-admin-fg">{f.label}</div>
                            <div className="text-xs text-admin-muted mt-0.5">
                              <span className="font-mono">{f.key}</span>
                              {f.unit && <span> ({f.unit})</span>}
                              {f.required && (<span className="text-admin-destructive font-semibold"> * required</span>)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <input form={formId} name="value" className="admin-input w-full" defaultValue={s?.value ?? ''} placeholder="Value..." />
                          </td>
                          <td className="py-3.5 px-4">
                            <input form={formId} name="sourceRef" className="admin-input w-full font-mono text-xs" defaultValue={s?.sourceRef ?? ''} placeholder="https://..." />
                          </td>
                          <td className="py-3.5 px-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs select-none">
                              <input form={formId} type="checkbox" name="verified" defaultChecked={!!s?.verifiedAt} className="rounded-admin text-admin-accent cursor-pointer" />
                              <span className={s?.verifiedAt ? 'text-admin-muted' : 'font-medium text-admin-fg'}>
                                {s?.verifiedAt ? 'Verified' : 'Unchecked'}
                              </span>
                            </label>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <form id={formId} action={saveSpec}>
                              <input type="hidden" name="productId" value={product.id} />
                              <input type="hidden" name="key" value={f.key} />
                              <ConfirmFormButton
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                dialogTitle={`Save Spec: ${f.label}?`}
                                dialogDescription={`Update specification "${f.label}" for ${product.title}?`}
                                confirmText="Save Spec"
                              >
                                <Save size={12} />
                                Save
                              </ConfirmFormButton>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identifiers">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Product Identifiers & Media</CardTitle>
                <CardDescription>
                  GTIN (barcode/UPC/EAN) and MPN are critical for SerpApi shopping matches and automated price tracking.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form action={updateIdentifiers} className="grid gap-4 max-w-xl">
                <input type="hidden" name="productId" value={product.id} />

                <div className="admin-form-group flex flex-col gap-1.5">
                  <label className="admin-label text-xs font-semibold text-admin-fg">GTIN / UPC / EAN</label>
                  <input name="gtin" className="admin-input w-full font-mono text-sm" defaultValue={product.gtin ?? ''} placeholder="12 or 13 digit numeric barcode" inputMode="numeric" />
                  <span className="admin-form-hint text-xs text-admin-muted">
                    Required for accurate retailer matching and pricing validation.
                  </span>
                </div>

                <div className="admin-form-group flex flex-col gap-1.5">
                  <label className="admin-label text-xs font-semibold text-admin-fg">MPN (Manufacturer Part Number)</label>
                  <input name="mpn" className="admin-input w-full font-mono text-sm" defaultValue={product.mpn ?? ''} placeholder="e.g. WH-1000XM5/B" />
                </div>

                <div className="admin-form-group flex flex-col gap-1.5">
                  <label className="admin-label text-xs font-semibold text-admin-fg">Product Image URL</label>
                  <input name="imageUrl" className="admin-input w-full font-mono text-sm" defaultValue={product.imageUrl ?? ''} placeholder="https://..." />
                  {product.imageUrl && (
                    <div className="mt-2.5 flex items-center gap-3">
                      <img src={product.imageUrl} alt={product.title} className="w-16 h-16 object-contain border border-admin-border rounded-admin bg-white p-1" />
                      <span className="text-xs text-admin-muted">Preview image loaded from URL</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <ConfirmFormButton
                    className="admin-btn admin-btn-primary"
                    dialogTitle="Save Product Identifiers?"
                    dialogDescription="Update GTIN, MPN, and image URL for this product?"
                    confirmText="Save Identifiers"
                  >
                    Save Identifiers
                  </ConfirmFormButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Retailer Offers & Price Observations ({product.offers.length})</CardTitle>
                <CardDescription>
                  Offers observed through SerpApi or manual ingest. Live prices must be refreshed within 72h to pass
                  publication checks.
                </CardDescription>
              </div>
              <form>
                <input type="hidden" name="productId" value={product.id} />
                <ConfirmFormButton
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  dialogTitle="Find prices now?"
                  dialogDescription="Searches Google Shopping (SerpApi) for this product now instead of waiting for the daily refresh. Uses one API call."
                  confirmText="Search now"
                  formAction={findPricesNow}
                >
                  <RefreshCw size={13} />
                  Find prices now
                </ConfirmFormButton>
              </form>
            </CardHeader>
            <CardContent noPadding>
              {product.offers.length === 0 ? (
                <div className="p-8">
                  <p className="text-sm text-admin-muted m-0">
                    No offers yet. Use "Find prices now", or wait for the daily price refresh.
                  </p>
                </div>
              ) : (
                <div className="admin-table-container w-full overflow-x-auto">
                  <table className="admin-table w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-admin-border-subtle">
                        <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Retailer</th>
                        <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Observed Price</th>
                        <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Stock Status</th>
                        <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Last Seen</th>
                        <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Affiliate Program</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border-subtle">
                      {product.offers.map((o: any) => (
                        <tr key={o.id} className="hover:bg-admin-muted-bg/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-admin-fg hover:text-admin-accent inline-flex items-center gap-1.5 no-underline">
                              {o.retailer.name} <ExternalLink size={11} className="text-admin-muted" />
                            </a>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-sm text-admin-fg">
                            {o.priceCents != null ? formatPrice(o.priceCents, o.currency) : '—'}
                          </td>

                          <td className="py-3.5 px-4">
                            {o.inStock === true ? (
                              <span className="admin-badge admin-badge-ok inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-ok-subtle text-admin-ok border border-admin-ok-border">In Stock</span>
                            ) : o.inStock === false ? (
                              <span className="admin-badge admin-badge-err inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-destructive-subtle text-admin-destructive border border-admin-destructive-border">Out of Stock</span>
                            ) : (
                              <span className="text-xs text-admin-muted">Unknown</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-admin-muted text-xs">{formatDate(new Date(o.lastSeenAt))}</td>

                          <td className="py-3.5 px-4">
                            {o.retailer.affiliateProgram?.active ? (
                              <span className="admin-badge admin-badge-ok inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-ok-subtle text-admin-ok border border-admin-ok-border">
                                {o.retailer.affiliateProgram.network} active
                              </span>
                            ) : (
                              <span className="admin-badge admin-badge-draft inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-muted-bg text-admin-muted border border-admin-border">direct only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Editorial Page Copy</CardTitle>
                <CardDescription>
                  Synthesized by the LLM pool strictly from verified specifications. Must be reviewed and approved
                  prior to publication.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  {copy ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-admin-muted">Status:</span>
                      <StatusBadge status={copy.status} />
                      <Link href={`/admin/content/${copy.id}`} className="admin-btn admin-btn-secondary admin-btn-sm">
                        Open in Copy Studio
                      </Link>
                    </div>
                  ) : (
                    <div className="text-xs text-admin-muted">No copy generated for this product yet.</div>
                  )}
                </div>

                <div>
                  <GenerateButton pageType="product" pageKey={product.slug} back={`/admin/products/${product.id}`} hasCopy={!!copy} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8 border-admin-destructive-border bg-admin-destructive-subtle/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-admin-destructive font-bold">Danger zone</CardTitle>
            <CardDescription>
              Deleting removes this product, its specs, prices, page copy and any comparisons that include it. Best-of
              lists that pick it go back to draft. This can&apos;t be undone; to hide it but keep the data, use Unpublish instead.
            </CardDescription>
          </div>
          <form className="shrink-0">
            <input type="hidden" name="productId" value={product.id} />
            <ConfirmFormButton
              className="admin-btn admin-btn-destructive"
              tone="destructive"
              dialogTitle={`Delete ${product.title} permanently?`}
              dialogDescription="Its specs, prices, page copy and comparisons will be deleted, and its public page removed. This can't be undone."
              confirmText="Delete permanently"
              formAction={deleteProduct}
            >
              <Trash2 size={14} />
              Delete product
            </ConfirmFormButton>
          </form>
        </CardHeader>
      </Card>
    </div>
  );
}
