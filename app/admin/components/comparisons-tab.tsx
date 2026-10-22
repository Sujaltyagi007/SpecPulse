'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useToast } from '@/components/admin/toast';
import { GenerateButton } from '@/components/admin';
import { StatusBadge } from '@/components/admin/badge';
import { EmptyState } from '@/components/admin/empty-state';
import { TableSkeleton } from '@/components/admin/skeleton';
import { useTabData, markTabDirty } from '@/lib/admin-cache';
import { useConfirm } from '@/components/admin/alert-dialog';
import { GitCompare, Plus, RotateCw, ExternalLink, Archive, Sparkles } from 'lucide-react';
import { getComparisonsData, apiCreateComparison, apiUnpublishComparison } from '../data-actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';

export function ComparisonsTab() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { data, isLoading, isRefreshing, error, refresh, updateData } = useTabData('admin-comparisons', getComparisonsData);

  const [productA, setProductA] = useState<string>('');
  const [productB, setProductB] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productA || !productB) {
      toast.error('Selection required', 'Please select two products to compare.');
      return;
    }
    const aId = Number(productA);
    const bId = Number(productB);

    if (aId === bId) {
      toast.error('Invalid selection', 'Pick two different products.');
      return;
    }

    const prodA = data?.products.find((p) => p.id === aId);
    const prodB = data?.products.find((p) => p.id === bId);

    if (prodA?.categoryId !== prodB?.categoryId) {
      toast.error('Category mismatch', 'Both products must belong to the exact same category.');
      return;
    }

    const ok = await confirm({
      title: 'Create Comparison Page?',
      description: `Create a head-to-head comparison page for "${prodA?.title}" vs "${prodB?.title}"?`,
      confirmText: 'Create Comparison',
      tone: 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    const res = await apiCreateComparison(aId, bId);
    setIsSubmitting(false);

    if (res.ok && res.comparison) {
      toast.success('Comparison Created', `Page created: ${res.comparison.slug}`);
      setProductA('');
      setProductB('');
      await refresh();
      markTabDirty('admin-overview');
    } else {
      toast.error('Failed to create', res.error);
    }
  };

  const handleUnpublish = async (comp: { id: number; slug: string }) => {
    const ok = await confirm({
      title: 'Unpublish Comparison?',
      description: `Unpublish the comparison page "${comp.slug}" and revert it to draft?`,
      confirmText: 'Unpublish',
      tone: 'destructive',
    });
    if (!ok) return;

    setActionLoadingId(comp.id);
    const res = await apiUnpublishComparison(comp.id);
    setActionLoadingId(null);

    if (res.ok) {
      toast.info('Comparison Unpublished', `"${comp.slug}" reverted to draft.`);
      updateData((prev) =>
        prev
          ? {
              ...prev,
              comparisons: prev.comparisons.map((c) => (c.id === comp.id ? { ...c, status: 'draft' as const } : c)),
            }
          : prev!
      );
      markTabDirty('admin-overview');
    } else {
      toast.error('Action Failed', res.error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparisons</CardTitle>
          <CardDescription>Loading comparisons list...</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} cols={4} />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Could not load comparisons"
        description={error || 'An error occurred'}
        action={
          <button onClick={() => refresh()} className="admin-btn admin-btn-secondary">
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create Comparison Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus size={18} className="text-admin-accent" />
              Create Comparison
            </CardTitle>
            <CardDescription>
              Pair two products from the same category to generate a head-to-head comparison page.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3.5">
            <div className="flex-1 min-w-[240px]">
              <label className="admin-label block text-xs font-semibold text-admin-fg mb-1.5">Product A</label>
              <select
                className="admin-select w-full"
                required
                value={productA}
                onChange={(e) => setProductA(e.target.value)}
              >
                <option value="">Select First Product...</option>
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.categoryName}] {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[240px]">
              <label className="admin-label block text-xs font-semibold text-admin-fg mb-1.5">Product B</label>
              <select
                className="admin-select w-full"
                required
                value={productB}
                onChange={(e) => setProductB(e.target.value)}
              >
                <option value="">Select Second Product...</option>
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.categoryName}] {p.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !productA || !productB}
              className="admin-btn admin-btn-primary"
            >
              <Plus size={14} />
              {isSubmitting ? 'Creating...' : 'Create Comparison'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Comparisons Table Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompare size={18} className="text-admin-accent" />
              All Comparisons ({data.comparisons.length})
            </CardTitle>
            <CardDescription>
              Comparisons go live once verified copy is approved and both products are published.
            </CardDescription>
          </div>

          <button
            onClick={() => refresh()}
            disabled={isRefreshing}
            className="admin-btn admin-btn-secondary admin-btn-sm"
            title="Refresh comparisons"
          >
            <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </CardHeader>

        <CardContent noPadding>
          {data.comparisons.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<GitCompare size={24} className="text-admin-muted" />}
                title="No comparisons created yet"
                description="Select two products above to generate your first product comparison."
              />
            </div>
          ) : (
            <div className="admin-table-container w-full overflow-x-auto">
              <table className="admin-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-admin-border-subtle">
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Comparison Pair</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Page Status</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Editorial Copy</th>
                    <th className="py-3 px-4 text-right font-semibold text-xs text-admin-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border-subtle">
                  {data.comparisons.map((c) => {
                    const isProcessing = actionLoadingId === c.id;
                    return (
                      <tr key={c.id} className="hover:bg-admin-muted-bg/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-sm text-admin-fg">
                            {c.productA.title} <span className="text-admin-muted font-normal text-xs">vs</span> {c.productB.title}
                          </div>
                          <div className="text-xs text-admin-muted mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono">{c.slug}</span>
                            {c.status === 'published' && (
                              <>
                                <span>·</span>
                                <Link
                                  href={`/compare/${c.slug}`}
                                  target="_blank"
                                  className="text-admin-accent inline-flex items-center gap-1 hover:underline"
                                >
                                  View live <ExternalLink size={10} />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={c.status} />
                        </td>

                        <td className="py-3.5 px-4">
                          {c.pageCopy ? (
                            <Link
                              href={`/admin/content/${c.pageCopy.id}`}
                              className="inline-flex items-center gap-1.5 no-underline hover:opacity-85 transition-opacity"
                            >
                              <StatusBadge status={c.pageCopy.status} />
                            </Link>
                          ) : (
                            <span className="text-xs text-admin-muted">No copy generated</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <GenerateButton
                              pageType="comparison"
                              pageKey={c.slug}
                              back="/admin"
                              hasCopy={!!c.pageCopy}
                            />

                            {c.status === 'published' && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                className="admin-btn admin-btn-ghost admin-btn-sm text-admin-destructive hover:bg-admin-destructive-subtle"
                                onClick={() => handleUnpublish(c)}
                                title="Unpublish page"
                              >
                                <Archive size={13} />
                                Unpublish
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
