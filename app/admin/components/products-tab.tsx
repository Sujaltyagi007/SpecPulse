'use client';
import Link from 'next/link';
import { productPath } from '@/lib/site';
import { AnimatePresence } from 'motion/react';
import React, { Fragment, useEffect, useState } from 'react';
import { useToast } from '@/components/admin/toast';
import { StatusBadge } from '@/components/admin/badge';
import { Segmented } from '@/components/admin/segmented';
import { TableSkeleton } from '@/components/admin/skeleton';
import { EmptyState } from '@/components/admin/empty-state';
import { useConfirm } from '@/components/admin/alert-dialog';
import { useTabData, markTabDirty } from '@/lib/admin-cache';
import { MotionButton, MotionRow } from '@/components/admin/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';
import { Search, RotateCw, ExternalLink, ChevronRight, Layers, CheckCircle2, Send, Plus } from 'lucide-react';
import { getProductCatalog, apiArchiveProduct, apiApproveProduct, apiSendBackToDraft, apiSubmitForReview } from '../data-actions';

type StatusFilter = 'all' | 'draft' | 'review' | 'approved' | 'published' | 'archived';
type CatalogData = Awaited<ReturnType<typeof getProductCatalog>>;
type CatalogProduct = CatalogData['products'][number];

function nextStep(p: CatalogProduct): string {
  if (p.status === 'draft') return p.errors[0] ?? 'All checks pass. Send it to review.';
  if (p.status === 'review') return p.errors.length ? `Blocked: ${p.errors[0]}` : 'Checks pass. Waiting for your approval.';
  if (p.status === 'approved') return 'Goes live in the next daily publishing run.';
  if (p.status === 'published') return 'Live on the site.';
  return 'Hidden from the site.';
}

export function ProductsTab() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetcher = React.useCallback(() => {
    return getProductCatalog(searchTerm, selectedCategory, selectedStatus);
  }, [searchTerm, selectedCategory, selectedStatus]);

  const cacheKey = `products-${searchTerm}-${selectedCategory ?? 'all'}-${selectedStatus}`;
  const { data, isLoading, isRefreshing, error, refresh, updateData } = useTabData(cacheKey, fetcher, {
    ttlMs: 2 * 60 * 1000,
  });

  const afterChange = (id: number, status: CatalogProduct['status']) => {
    updateData((prev) => prev ? {
      ...prev, products: selectedStatus === 'all'
        ? prev.products.map((p) => (p.id === id ? { ...p, status } : p))
        : prev.products.filter((p) => p.id !== id),
    } : prev!);
    markTabDirty('admin-overview');
    markTabDirty('admin-home');
  };

  const run = async (
    product: CatalogProduct,
    opts: {
      title: string;
      description: string;
      confirmText: string;
      tone?: 'primary' | 'destructive';
      action: (id: number) => Promise<{ ok: boolean; error?: string }>;
      next: CatalogProduct['status'];
      done: string;
    },
  ) => {
    const ok = await confirm({ title: opts.title, description: opts.description, confirmText: opts.confirmText, tone: opts.tone });
    if (!ok) return;
    setActionLoadingId(product.id);
    const res = await opts.action(product.id);
    setActionLoadingId(null);
    if (!res.ok) return toast.error('Something went wrong', res.error);
    toast.success(opts.done, product.title);
    afterChange(product.id, opts.next);
  };

  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} style={{ color: 'var(--admin-accent)' }} />
            Products
          </CardTitle>
          <CardDescription>A product goes live once its specs, GTIN and price are checked and you approve it.</CardDescription>
        </div>
        <div className="admin-flex admin-items-center admin-gap-2">
          <Link href="/admin/products/new" className="admin-btn admin-btn-primary admin-btn-sm"><Plus size={14} /> Add product</Link>
          <MotionButton onClick={() => refresh()} disabled={isRefreshing} className="admin-btn admin-btn-secondary admin-btn-sm"
            title="Refresh products" aria-label="Refresh products"> <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </MotionButton>
        </div>
      </CardHeader>
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--admin-border-subtle)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Segmented<StatusFilter>
          ariaLabel="Filter by status"
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={[
            { value: 'all', label: 'All', count: total },
            { value: 'draft', label: 'Needs work', count: counts.draft ?? 0 },
            { value: 'review', label: 'In review', count: counts.review ?? 0 },
            { value: 'approved', label: 'Scheduled', count: counts.approved ?? 0 },
            { value: 'published', label: 'Live', count: counts.published ?? 0 },
            { value: 'archived', label: 'Archived', count: counts.archived ?? 0 },
          ]}
        />
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-muted)' }} />
          <input type="text" className="admin-input" style={{ paddingLeft: 32 }} placeholder="Search by name or GTIN" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        {data && data.categories.length > 1 && (
          <select className="admin-select" style={{ width: 'auto', minWidth: 150 }} value={selectedCategory ?? ''} onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <CardContent noPadding>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <TableSkeleton rows={8} cols={4} />
          </div>
        ) : error || !data ? (
          <div style={{ padding: 32 }}>
            <EmptyState title="Couldn't load products" description={error || 'An error occurred'} action={
              <button onClick={() => refresh()} className="admin-btn admin-btn-secondary">Try again</button>
            } />
          </div>
        ) : data.products.length === 0 ? (
          <div style={{ padding: 40 }}>
            <EmptyState icon={<CheckCircle2 size={24} style={{ color: 'var(--admin-ok)' }} />} title="Nothing here" description="No products match this filter." />
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Next step</th>
                  <th style={{ textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {data.products.map((p, i) => {
                    const busy = actionLoadingId === p.id;
                    const blocked = p.errors.length > 0;
                    return (
                      <MotionRow key={p.id} index={i}>
                        <td style={{ maxWidth: 280 }}>
                          <Link href={`/admin/products/${p.id}`} style={{ fontWeight: 600, color: 'var(--admin-fg)', textDecoration: 'none' }}>
                            {p.title}
                          </Link>
                          <div className="admin-text-xs admin-text-muted" style={{ marginTop: 2 }}>
                            {p.category.name}
                            {p.status === 'published' && (
                              <Fragment>
                                {' · '}
                                <Link href={productPath(p.category.slug, p.slug)} target="_blank" style={{ color: 'var(--admin-accent)' }}>
                                  View live <ExternalLink size={10} />
                                </Link>
                              </Fragment>
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="admin-text-sm" style={{ color: blocked ? 'var(--admin-destructive)' : 'var(--admin-muted)', maxWidth: 320 }}>
                          {nextStep(p)}
                          {p.errors.length > 1 && <span className="admin-text-muted"> (+{p.errors.length - 1} more)</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="admin-flex admin-items-center" style={{ justifyContent: 'flex-end', gap: 6 }}>
                            {p.status === 'draft' && !blocked && (
                              <MotionButton
                                disabled={busy}
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() =>
                                  run(p, {
                                    title: 'Send to review?',
                                    description: `${p.title} passes every check and will wait for approval.`,
                                    confirmText: 'Send to review',
                                    action: apiSubmitForReview,
                                    next: 'review',
                                    done: 'Sent to review',
                                  })
                                }
                              >
                                <Send size={13} /> Send to review
                              </MotionButton>
                            )}
                            {p.status === 'review' && (
                              <Fragment>
                                {!blocked && (
                                  <MotionButton
                                    disabled={busy}
                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                    onClick={() =>
                                      run(p, {
                                        title: 'Approve product?',
                                        description: `${p.title} will go live in the next daily publishing run.`,
                                        confirmText: 'Approve',
                                        action: apiApproveProduct,
                                        next: 'approved',
                                        done: 'Approved',
                                      })
                                    }
                                  >
                                    <CheckCircle2 size={13} /> Approve
                                  </MotionButton>
                                )}
                                <MotionButton
                                  disabled={busy}
                                  className="admin-btn admin-btn-ghost admin-btn-sm"
                                  onClick={() =>
                                    run(p, {
                                      title: 'Send back to Needs work?',
                                      description: `${p.title} will need to be sent to review again.`,
                                      confirmText: 'Send back',
                                      tone: 'destructive',
                                      action: apiSendBackToDraft,
                                      next: 'draft',
                                      done: 'Sent back',
                                    })
                                  }
                                >
                                  Reject
                                </MotionButton>
                              </Fragment>
                            )}
                            {p.status === 'published' && (
                              <MotionButton
                                disabled={busy}
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                style={{ color: 'var(--admin-destructive)' }}
                                onClick={() =>
                                  run(p, {
                                    title: 'Unpublish product?',
                                    description: `${p.title} will be removed from the public site straight away.`,
                                    confirmText: 'Unpublish',
                                    tone: 'destructive',
                                    action: apiArchiveProduct,
                                    next: 'archived',
                                    done: 'Unpublished',
                                  })
                                }
                              >
                                Unpublish
                              </MotionButton>
                            )}
                            <Link href={`/admin/products/${p.id}`} className="admin-btn admin-btn-ghost admin-btn-sm" title="Open product">
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </td>
                      </MotionRow>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
