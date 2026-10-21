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
    <div style={{ paddingBottom: 48 }}>
      <nav className="admin-breadcrumb">
        <Link href="/admin">Console</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <Link href="/admin">Products</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <span>{product.category.name}</span>
      </nav>

      <div className="admin-page-header">
        <div>
          <div className="admin-flex admin-items-center admin-gap-3" style={{ marginBottom: 6 }}>
            <h1 className="admin-page-title">{product.title}</h1>
            <StatusBadge status={product.status} />
            <IssueBadge errors={errors.length} warnings={warnings.length} />
          </div>

          <div className="admin-text-sm admin-text-muted admin-flex admin-items-center admin-gap-3">
            <span>Category: {product.category.name}</span>
            <span>·</span>
            <span>Slug: {product.slug}</span>
            {product.status === 'published' && (
              <Fragment>
                <span>·</span>
                <Link href={productPath(product.category.slug, product.slug)} target="_blank" className="admin-external-link" style={{ padding: 0 }}>
                  View live page <ExternalLink size={12} />
                </Link>
              </Fragment>
            )}
          </div>
        </div>
        <div className="admin-header-actions">
          <form className="admin-flex admin-items-center admin-gap-2">
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
                className="admin-btn admin-btn-outline"
                style={{ color: 'var(--admin-destructive)' }}
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
        <div style={{
          marginBottom: 24,
          padding: '14px 18px',
          borderRadius: 'var(--admin-radius)',
          backgroundColor: errors.length > 0 ? 'var(--admin-destructive-subtle)' : 'var(--admin-warn-subtle)',
          border: `1px solid ${errors.length > 0 ? 'var(--admin-destructive-border)' : 'var(--admin-warn-border)'}`,
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.84375rem', marginBottom: 4 }}>
            {errors.length > 0 ? 'Validation Requirements Pending' : 'Editorial Warnings'}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8125rem', lineHeight: 1.6 }}>
            {errors.map((e, idx) => (
              <li key={idx} style={{ color: 'var(--admin-destructive)' }}>
                {e}
              </li>
            ))}
            {warnings.map((w, idx) => (
              <li key={idx} style={{ color: 'var(--admin-warn)' }}>
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
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Specification Field</th>
                      <th>Value</th>
                      <th>Source Verification URL</th>
                      <th style={{ width: 110 }}>Verified</th>
                      <th style={{ textAlign: 'right', width: 90 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSpecFields.map((f: any) => {
                      const s = specs.get(f.key);
                      const formId = `spec-${f.key}`;
                      return (
                        <tr key={f.key}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{f.label}</div>
                            <div className="admin-text-xs admin-text-muted">
                              {f.key}
                              {f.unit && <span> ({f.unit})</span>}
                              {f.required && (<span style={{ color: 'var(--admin-destructive)', fontWeight: 600 }}> * required</span>)}
                            </div>
                          </td>
                          <td>
                            <input form={formId} name="value" className="admin-input" defaultValue={s?.value ?? ''} placeholder="Value..." />
                          </td>
                          <td>
                            <input form={formId} name="sourceRef" className="admin-input" defaultValue={s?.sourceRef ?? ''} placeholder="https://..." />
                          </td>
                          <td>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                              <input form={formId} type="checkbox" name="verified" defaultChecked={!!s?.verifiedAt} style={{ width: 'auto' }} />
                              <span className={s?.verifiedAt ? 'admin-text-muted' : ''}>
                                {s?.verifiedAt ? 'Verified' : 'Unchecked'}
                              </span>
                            </label>
                          </td>

                          <td style={{ textAlign: 'right' }}>
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
              <form action={updateIdentifiers} style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
                <input type="hidden" name="productId" value={product.id} />

                <div className="admin-form-group">
                  <label className="admin-label">GTIN / UPC / EAN</label>
                  <input name="gtin" className="admin-input" defaultValue={product.gtin ?? ''} placeholder="12 or 13 digit numeric barcode" inputMode="numeric" />
                  <span className="admin-form-hint">
                    Required for accurate retailer matching and pricing validation.
                  </span>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">MPN (Manufacturer Part Number)</label>
                  <input name="mpn" className="admin-input" defaultValue={product.mpn ?? ''} placeholder="e.g. WH-1000XM5/B" />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Product Image URL</label>
                  <input name="imageUrl" className="admin-input" defaultValue={product.imageUrl ?? ''} placeholder="https://..." />
                  {product.imageUrl && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={product.imageUrl} alt={product.title} style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid var(--admin-border)', borderRadius: 6, background: '#fff', }} />
                      <span className="admin-text-xs admin-text-muted">Preview image loaded from URL</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
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
                <div style={{ padding: 32 }}>
                  <p className="admin-text-muted" style={{ margin: 0 }}>
                    No offers yet. Use "Find prices now", or wait for the daily price refresh.
                  </p>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Retailer</th>
                        <th>Observed Price</th>
                        <th>Stock Status</th>
                        <th>Last Seen</th>
                        <th>Affiliate Program</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.offers.map((o: any) => (
                        <tr key={o.id}>
                          <td>
                            <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="admin-external-link" style={{ padding: 0, fontWeight: 600 }}>
                              {o.retailer.name} <ExternalLink size={12} />
                            </a>
                          </td>

                          <td style={{ fontWeight: 600 }}>
                            {o.priceCents != null ? formatPrice(o.priceCents, o.currency) : '—'}
                          </td>

                          <td>
                            {o.inStock === true ? (
                              <span className="admin-badge admin-badge-ok">In Stock</span>
                            ) : o.inStock === false ? (
                              <span className="admin-badge admin-badge-err">Out of Stock</span>
                            ) : (
                              <span className="admin-text-muted">Unknown</span>
                            )}
                          </td>

                          <td className="admin-text-muted admin-text-xs">{formatDate(new Date(o.lastSeenAt))}</td>

                          <td>
                            {o.retailer.affiliateProgram?.active ? (
                              <span className="admin-badge admin-badge-ok">
                                {o.retailer.affiliateProgram.network} active
                              </span>
                            ) : (
                              <span className="admin-badge admin-badge-draft">direct only</span>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="admin-flex admin-items-center admin-gap-3">
                  {copy ? (
                    <div className="admin-flex admin-items-center admin-gap-3">
                      <span>Status:</span>
                      <StatusBadge status={copy.status} />
                      <Link href={`/admin/content/${copy.id}`} className="admin-btn admin-btn-secondary admin-btn-sm">
                        Open in Copy Studio
                      </Link>
                    </div>
                  ) : (
                    <div className="admin-text-muted">No copy generated for this product yet.</div>
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

      <Card style={{ marginTop: 32, borderColor: 'var(--admin-destructive-border)' }}>
        <CardHeader>
          <div>
            <CardTitle style={{ color: 'var(--admin-destructive)' }}>Danger zone</CardTitle>
            <CardDescription>
              Deleting removes this product, its specs, prices, page copy and any comparisons that include it. Best-of
              lists that pick it go back to draft. This can&apos;t be undone; to hide it but keep the data, use Unpublish instead.
            </CardDescription>
          </div>
          <form>
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
