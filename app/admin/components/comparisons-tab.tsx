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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Create Comparison Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} style={{ color: 'var(--admin-accent)' }} />
              Create Comparison
            </CardTitle>
            <CardDescription>
              Pair two products from the same category to generate a head-to-head comparison page.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 240px' }}>
              <label className="admin-label">Product A</label>
              <select
                className="admin-select"
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

            <div style={{ flex: '1 1 240px' }}>
              <label className="admin-label">Product B</label>
              <select
                className="admin-select"
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
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitCompare size={18} style={{ color: 'var(--admin-accent)' }} />
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
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={<GitCompare size={24} style={{ color: 'var(--admin-muted)' }} />}
                title="No comparisons created yet"
                description="Select two products above to generate your first product comparison."
              />
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Comparison Pair</th>
                    <th>Page Status</th>
                    <th>Editorial Copy</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparisons.map((c) => {
                    const isProcessing = actionLoadingId === c.id;
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {c.productA.title} <span className="admin-text-muted" style={{ fontWeight: 400 }}>vs</span> {c.productB.title}
                          </div>
                          <div className="admin-text-xs admin-text-muted" style={{ marginTop: 2 }}>
                            {c.slug}
                            {c.status === 'published' && (
                              <>
                                {' · '}
                                <Link
                                  href={`/compare/${c.slug}`}
                                  target="_blank"
                                  className="admin-external-link"
                                  style={{ padding: 0 }}
                                >
                                  View live <ExternalLink size={11} />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>

                        <td>
                          <StatusBadge status={c.status} />
                        </td>

                        <td>
                          {c.pageCopy ? (
                            <Link
                              href={`/admin/content/${c.pageCopy.id}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                            >
                              <StatusBadge status={c.pageCopy.status} />
                            </Link>
                          ) : (
                            <span className="admin-text-xs admin-text-muted">No copy generated</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="admin-flex admin-items-center" style={{ justifyContent: 'flex-end', gap: 6 }}>
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
                                className="admin-btn admin-btn-outline admin-btn-sm"
                                style={{ color: 'var(--admin-destructive)' }}
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
