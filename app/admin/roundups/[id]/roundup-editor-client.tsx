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
    <div className="pb-12 max-w-7xl mx-auto flex flex-col gap-6">
      <nav className="admin-breadcrumb flex items-center gap-1.5 text-xs text-admin-muted">
        <Link href="/admin" className="hover:text-admin-fg transition-colors">Console</Link>
        <span className="text-admin-muted/60">/</span>
        <Link href="/admin?tab=roundups" className="hover:text-admin-fg transition-colors">Roundups</Link>
        <span className="text-admin-muted/60">/</span>
        <span className="text-admin-fg font-medium">{roundup.category.name}</span>
      </nav>

      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-admin-border-subtle">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-admin-fg m-0">{roundup.title}</h1>
            <StatusBadge status={roundup.status} />
          </div>

          <div className="text-xs text-admin-muted flex flex-wrap items-center gap-2">
            <span>Category: <span className="font-medium text-admin-fg">{roundup.category.name}</span></span>
            {roundup.useCase && (
              <Fragment>
                <span>·</span>
                <span>Focus: <span className="font-medium text-admin-fg">{roundup.useCase}</span></span>
              </Fragment>
            )}
            {locked && (
              <Fragment>
                <span>·</span>
                <Link
                  href={`/best/${roundup.slug}`}
                  target="_blank"
                  className="text-admin-accent inline-flex items-center gap-1 hover:underline"
                >
                  View live guide <ExternalLink size={11} />
                </Link>
              </Fragment>
            )}
          </div>
        </div>

        {locked && (
          <form action={unpublishPage} className="admin-header-actions shrink-0">
            <input type="hidden" name="pageType" value="roundup" />
            <input type="hidden" name="id" value={roundup.id} />
            <ConfirmFormButton
              className="admin-btn admin-btn-outline text-admin-destructive hover:bg-admin-destructive-subtle"
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
                <CardDescription className="mt-1">
                  Editorial ranking of recommended products. Modifying picks reverts editorial copy to draft status.
                  {locked && ' Unpublish this roundup to edit or rearrange picks.'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent noPadding>
              {roundup.items.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-admin-muted m-0">
                    No picks added yet. Switch to the &quot;Add / Update Pick&quot; tab to add products.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-admin-border-subtle bg-admin-muted-bg/50">
                        <th className="py-2.5 px-4 font-semibold text-admin-muted w-16">Rank</th>
                        <th className="py-2.5 px-4 font-semibold text-admin-muted">Product</th>
                        <th className="py-2.5 px-4 font-semibold text-admin-muted">Editorial Award Label</th>
                        {!locked && <th className="py-2.5 px-4 font-semibold text-admin-muted text-right w-24">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border-subtle">
                      {roundup.items.map((item: any) => (
                        <tr key={item.productId} className="hover:bg-admin-hover/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-admin-primary text-admin-primary-fg font-bold text-xs">
                              {item.rank}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <Link
                              href={`/admin/products/${item.productId}`}
                              className="font-medium text-admin-fg inline-flex items-center gap-1 hover:text-admin-accent transition-colors"
                            >
                              {item.product.title}
                              <ArrowUpRight size={12} className="text-admin-muted" />
                            </Link>
                            <div className="text-[11px] text-admin-muted mt-0.5">
                              Status: <span className="capitalize">{item.product.status}</span>
                              {item.product.status !== 'published' && ' (not live on site yet)'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {item.label ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-admin-ok-subtle text-admin-ok border border-admin-ok-border">
                                {item.label}
                              </span>
                            ) : (
                              <span className="text-admin-muted">—</span>
                            )}
                          </td>

                          {!locked && (
                            <td className="py-3 px-4 text-right">
                              <form action={removeRoundupItem}>
                                <input type="hidden" name="roundupId" value={roundup.id} />
                                <input type="hidden" name="productId" value={item.productId} />
                                <ConfirmFormButton
                                  className="admin-btn admin-btn-ghost admin-btn-sm text-admin-destructive hover:bg-admin-destructive-subtle"
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
                  <CardDescription className="mt-1">
                    Select any non-archived product from category &quot;{roundup.category.name}&quot; to assign a ranking.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form action={saveRoundupItem} className="grid gap-4 max-w-lg">
                  <input type="hidden" name="roundupId" value={roundup.id} />

                  <div className="admin-form-group flex flex-col gap-1.5">
                    <label className="admin-label font-medium text-xs text-admin-fg">Product</label>
                    <select name="productId" required className="admin-select w-full">
                      <option value="">Choose product...</option>
                      {candidates.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>

                  <div className="admin-form-group flex flex-col gap-1.5">
                    <label className="admin-label font-medium text-xs text-admin-fg">Rank Order Position</label>
                    <input name="rank" type="number" min={1} required className="admin-input w-full" defaultValue={roundup.items.length + 1} />
                  </div>

                  <div className="admin-form-group flex flex-col gap-1.5">
                    <label className="admin-label font-medium text-xs text-admin-fg">
                      Editorial Award Label <span className="admin-label-optional font-normal text-admin-muted text-[11px]">(e.g. Best overall, Best budget, Best battery)</span>
                    </label>
                    <input name="label" className="admin-input w-full" placeholder="e.g. Best overall" />
                  </div>

                  <div className="pt-2">
                    <ConfirmFormButton
                      className="admin-btn admin-btn-primary"
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
                <CardDescription className="mt-1">Requires at least two ranked picks. Drafted by LLM using the verified specs of each ranked pick.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  {copy ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-admin-muted font-medium">Status:</span>
                      <StatusBadge status={copy.status} />
                      <Link href={`/admin/content/${copy.id}`} className="admin-btn admin-btn-secondary admin-btn-sm font-medium">
                        Open in Copy Studio
                      </Link>
                    </div>
                  ) : (
                    <div className="text-xs text-admin-muted">No copy generated for this roundup guide yet.</div>
                  )}
                </div>

                <div>
                  {roundup.items.length >= 2 ? (
                    <GenerateButton pageType="roundup" pageKey={roundup.slug} back={back} hasCopy={!!copy} />
                  ) : (
                    <div className="text-xs text-admin-muted">Add at least 2 picks before generating roundup copy.</div>
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
