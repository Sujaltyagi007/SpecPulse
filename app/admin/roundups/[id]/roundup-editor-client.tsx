'use client';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { StatusBadge } from '@/components/admin/badge';
import { ActionError, GenerateButton } from '@/components/admin';
import { ConfirmFormButton } from '@/components/admin/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/tabs';
import { Award, Plus, FileText, ExternalLink, Trash2, ArrowUpRight } from 'lucide-react';
import { removeRoundupItem, saveRoundupItem, unpublishPage } from '../../content-actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';

export function RoundupEditorClient({ roundup, candidates, copy, error }: {
  roundup: any; candidates: any[];
  copy: any; error?: string;
}) {
  const [activeTab, setActiveTab] = useState('picks');
  const locked = roundup.status === 'published';
  const back = `/admin/roundups/${roundup.id}`;

  return (
    <div style={{ paddingBottom: 48 }}>
      <nav className="admin-breadcrumb">
        <Link href="/admin">Console</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <Link href="/admin/roundups">Roundups</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <span>{roundup.category.name}</span>
      </nav>

      <div className="admin-page-header">
        <div>
          <div className="admin-flex admin-items-center admin-gap-3" style={{ marginBottom: 6 }}>
            <h1 className="admin-page-title">{roundup.title}</h1>
            <StatusBadge status={roundup.status} />
          </div>

          <div className="admin-text-sm admin-text-muted admin-flex admin-items-center admin-gap-3">
            <span>Category: {roundup.category.name}</span>
            {roundup.useCase && (
              <Fragment>
                <span>·</span>
                <span>Focus: {roundup.useCase}</span>
              </Fragment>
            )}
            {locked && (
              <Fragment>
                <span>·</span>
                <Link href={`/best/${roundup.slug}`} target="_blank" className="admin-external-link" style={{ padding: 0 }}>
                  View live guide <ExternalLink size={12} />
                </Link>
              </Fragment>
            )}
          </div>
        </div>

        {locked && (
          <form action={unpublishPage} className="admin-header-actions">
            <input type="hidden" name="pageType" value="roundup" />
            <input type="hidden" name="id" value={roundup.id} />
            <ConfirmFormButton
              className="admin-btn admin-btn-outline"
              style={{ color: 'var(--admin-destructive)' }}
              dialogTitle="Unpublish Roundup Guide?"
              dialogDescription="This will take the live buyer's guide offline and revert it to draft status."
              confirmText="Unpublish Guide"
              tone="destructive"
            >
              Unpublish Guide
            </ConfirmFormButton>
          </form>
        )}
      </div>

      <ActionError message={error} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="picks" icon={<Award size={14} />} badge={roundup.items.length}>
            Ranked Picks
          </TabsTrigger>
          {!locked && (
            <TabsTrigger value="add" icon={<Plus size={14} />}>
              Add / Update Pick
            </TabsTrigger>
          )}
          <TabsTrigger value="copy" icon={<FileText size={14} />}>
            Editorial Copy & Publishing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picks">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Curated Product Rankings ({roundup.items.length})</CardTitle>
                <CardDescription>
                  Editorial ranking of recommended products. Modifying picks reverts editorial copy to draft status.
                  {locked && ' Unpublish this roundup to edit or rearrange picks.'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent noPadding>
              {roundup.items.length === 0 ? (
                <div style={{ padding: 32 }}>
                  <p className="admin-text-muted" style={{ margin: 0 }}>
                    No picks added yet. Switch to the "Add / Update Pick" tab to add products.
                  </p>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Rank</th>
                        <th>Product</th>
                        <th>Editorial Award Label</th>
                        {!locked && <th style={{ textAlign: 'right', width: 100 }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {roundup.items.map((item: any) => (
                        <tr key={item.productId}>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: 'var(--admin-primary)',
                              color: 'var(--admin-primary-fg)',
                              fontWeight: 700,
                              fontSize: '0.8125rem',
                            }}>{item.rank}</span></td>

                          <td>
                            <Link href={`/admin/products/${item.productId}`} style={{
                              fontWeight: 600,
                              color: 'var(--admin-fg)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}>
                              {item.product.title}
                              <ArrowUpRight size={12} style={{ color: 'var(--admin-muted)' }} />
                            </Link>
                            <div className="admin-text-xs admin-text-muted">
                              Status: {item.product.status}
                              {item.product.status !== 'published' && ' (not live on site yet)'}
                            </div>
                          </td>

                          <td>
                            {item.label ? (
                              <span className="admin-badge admin-badge-ok">{item.label}</span>
                            ) : (
                              <span className="admin-text-muted">—</span>
                            )}
                          </td>

                          {!locked && (
                            <td style={{ textAlign: 'right' }}>
                              <form action={removeRoundupItem}>
                                <input type="hidden" name="roundupId" value={roundup.id} />
                                <input type="hidden" name="productId" value={item.productId} />
                                <ConfirmFormButton
                                  className="admin-btn admin-btn-ghost admin-btn-sm"
                                  style={{ color: 'var(--admin-destructive)' }}
                                  dialogTitle="Remove Pick from Roundup?"
                                  dialogDescription={`Remove "${item.product.title}" from this roundup? This will mark copy as requiring regeneration.`}
                                  confirmText="Remove Pick"
                                  tone="destructive"
                                >
                                  <Trash2 size={13} />
                                  Remove
                                </ConfirmFormButton>
                              </form>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {!locked && (
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Add or Re-rank Product Pick</CardTitle>
                  <CardDescription>
                    Select any non-archived product from category "{roundup.category.name}" to assign a ranking.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form action={saveRoundupItem} style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
                  <input type="hidden" name="roundupId" value={roundup.id} />

                  <div className="admin-form-group">
                    <label className="admin-label">Product</label>
                    <select name="productId" required className="admin-select">
                      <option value="">Choose product...</option>
                      {candidates.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Rank Order Position</label>
                    <input name="rank" type="number" min={1} required className="admin-input" defaultValue={roundup.items.length + 1} />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">
                      Editorial Award Label <span className="admin-label-optional">(e.g. Best overall, Best budget, Best battery)</span>
                    </label>
                    <input name="label" className="admin-input" placeholder="e.g. Best overall" />
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <ConfirmFormButton className="admin-btn admin-btn-primary"
                      dialogTitle="Add Product Pick?"
                      dialogDescription="Save this pick to the roundup? Modifying picks will send copy back to draft."
                      confirmText="Add / Update Pick"
                    >
                      <Plus size={14} />
                      Save Pick to Guide
                    </ConfirmFormButton>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="copy">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Editorial Guide Copy</CardTitle>
                <CardDescription>Requires at least two ranked picks. Drafted by LLM using the verified specs of each ranked pick.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="admin-flex admin-items-center admin-gap-3">
                  {copy ? (
                    <div className="admin-flex admin-items-center admin-gap-3">
                      <span>Status:</span>
                      <StatusBadge status={copy.status} />
                      <Link href={`/admin/content/${copy.id}`} className="admin-btn admin-btn-secondary admin-btn-sm">Open in Copy Studio</Link>
                    </div>
                  ) : (
                    <div className="admin-text-muted">No copy generated for this roundup guide yet.</div>
                  )}
                </div>

                <div>
                  {roundup.items.length >= 2 ? (
                    <GenerateButton pageType="roundup" pageKey={roundup.slug} back={back} hasCopy={!!copy} />
                  ) : (
                    <div className="admin-text-sm admin-text-muted">Add at least 2 picks before generating roundup copy.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
