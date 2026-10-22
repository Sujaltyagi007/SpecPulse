'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useToast } from '@/components/admin/toast';
import { StatusBadge } from '@/components/admin/badge';
import { EmptyState } from '@/components/admin/empty-state';
import { TableSkeleton } from '@/components/admin/skeleton';
import { useConfirm } from '@/components/admin/alert-dialog';
import { useTabData, markTabDirty } from '@/lib/admin-cache';
import { getRoundupsData, apiCreateRoundup } from '../data-actions';
import { Award, Plus, RotateCw, ExternalLink, Edit3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';

export function RoundupsTab() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { data, isLoading, isRefreshing, error, refresh } = useTabData('admin-roundups', getRoundupsData);

  const [categoryId, setCategoryId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [useCase, setUseCase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !title.trim()) {
      toast.error('Missing fields', 'Category and title are required.');
      return;
    }

    const cat = data?.categories.find((c) => c.id === Number(categoryId));

    const ok = await confirm({
      title: 'Create Roundup Guide?',
      description: `Create a new roundup guide titled "${title.trim()}" in category "${cat?.name}"?`,
      confirmText: 'Create Roundup',
      tone: 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    const res = await apiCreateRoundup(Number(categoryId), title, useCase);
    setIsSubmitting(false);

    if (res.ok && res.roundup) {
      toast.success('Roundup Created', `Guide created: "${res.roundup.title}"`);
      setTitle('');
      setUseCase('');
      await refresh();
      markTabDirty('admin-overview');
    } else {
      toast.error('Failed to create', res.error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roundups</CardTitle>
          <CardDescription>Loading best-of roundup guides...</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} cols={4} />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <EmptyState title="Could not load roundups" description={error || 'An error occurred'} action={
        <button onClick={() => refresh()} className="admin-btn admin-btn-secondary">
          Retry
        </button>
      } />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus size={18} className="text-admin-accent" />
              Create "Best Of" Roundup Guide
            </CardTitle>
            <CardDescription>
              Create an editorial buyer's guide ranking the top picks within a specific category.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3.5">
            <div className="flex-1 min-w-[200px]">
              <label className="admin-label block text-xs font-semibold text-admin-fg mb-1.5">Category</label>
              <select className="admin-select w-full" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select Category...</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-[2] min-w-[280px]">
              <label className="admin-label block text-xs font-semibold text-admin-fg mb-1.5">Title</label>
              <input type="text" className="admin-input w-full" required placeholder="e.g. Best wireless earbuds for running" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="admin-label block text-xs font-semibold text-admin-fg mb-1.5">
                Use Case <span className="admin-label-optional text-admin-muted font-normal text-xs">(optional)</span>
              </label>
              <input type="text" className="admin-input w-full" placeholder="e.g. for running" value={useCase} onChange={(e) => setUseCase(e.target.value)} />
            </div>

            <button type="submit" disabled={isSubmitting || !categoryId || !title.trim()} className="admin-btn admin-btn-primary">
              <Plus size={14} />
              {isSubmitting ? 'Creating...' : 'Create Roundup'}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award size={18} className="text-admin-accent" />
              All Roundup Guides ({data.roundups.length})
            </CardTitle>
            <CardDescription>
              Rank and curate product picks, generate facts-verified copy, and publish guides.
            </CardDescription>
          </div>

          <button onClick={() => refresh()} disabled={isRefreshing} className="admin-btn admin-btn-secondary admin-btn-sm" title="Refresh roundups">
            <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </CardHeader>

        <CardContent noPadding>
          {data.roundups.length === 0 ? (
            <div className="p-8">
              <EmptyState icon={<Award size={24} className="text-admin-muted" />} title="No roundups created yet" description="Use the form above to create your first buyer's guide." />
            </div>
          ) : (
            <div className="admin-table-container w-full overflow-x-auto">
              <table className="admin-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-admin-border-subtle">
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Roundup Guide</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Category</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Ranked Picks</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-right font-semibold text-xs text-admin-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border-subtle">
                  {data.roundups.map((r) => (
                    <tr key={r.id} className="hover:bg-admin-muted-bg/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link href={`/admin/roundups/${r.id}`} className="font-semibold text-sm text-admin-fg hover:text-admin-accent transition-colors no-underline">
                          {r.title}
                        </Link>
                        {r.useCase && (
                          <div className="text-xs text-admin-muted mt-0.5">
                            Focus: {r.useCase}
                          </div>
                        )}
                        {r.status === 'published' && (
                          <div className="mt-1">
                            <Link href={`/best/${r.slug}`} target="_blank" className="text-admin-accent inline-flex items-center gap-1 text-xs hover:underline">
                              View live <ExternalLink size={10} />
                            </Link>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-admin-muted">{r.category.name}</td>

                      <td className="py-3.5 px-4">
                        <span className="admin-badge admin-badge-draft inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-muted-bg text-admin-muted border border-admin-border">
                          {r.picksCount} {r.picksCount === 1 ? 'pick' : 'picks'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/admin/roundups/${r.id}`} className="admin-btn admin-btn-secondary admin-btn-sm" title="Manage picks and copy">
                          <Edit3 size={13} />
                          Manage Picks
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
