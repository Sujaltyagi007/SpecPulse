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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        <CardHeader>
          <div>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} style={{ color: 'var(--admin-accent)' }} />
              Create "Best Of" Roundup Guide
            </CardTitle>
            <CardDescription>
              Create an editorial buyer's guide ranking the top picks within a specific category.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="admin-label">Category</label>
              <select className="admin-select" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select Category...</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '2 1 280px' }}>
              <label className="admin-label">Title</label>
              <input type="text" className="admin-input" required placeholder="e.g. Best wireless earbuds for running" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <label className="admin-label">
                Use Case <span className="admin-label-optional">(optional)</span>
              </label>
              <input type="text" className="admin-input" placeholder="e.g. for running" value={useCase} onChange={(e) => setUseCase(e.target.value)} />
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
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} style={{ color: 'var(--admin-accent)' }} />
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
            <div style={{ padding: 32 }}>
              <EmptyState icon={<Award size={24} style={{ color: 'var(--admin-muted)' }} />} title="No roundups created yet" description="Use the form above to create your first buyer's guide." />
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Roundup Guide</th>
                    <th>Category</th>
                    <th>Ranked Picks</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roundups.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/roundups/${r.id}`} style={{ fontWeight: 600, color: 'var(--admin-fg)', textDecoration: 'none' }}>
                          {r.title}
                        </Link>
                        {r.useCase && (
                          <div className="admin-text-xs admin-text-muted" style={{ marginTop: 2 }}>
                            Focus: {r.useCase}
                          </div>
                        )}
                        {r.status === 'published' && (
                          <div style={{ marginTop: 2 }}>
                            <Link href={`/best/${r.slug}`} target="_blank" className="admin-external-link" style={{ padding: 0 }}>
                              View live <ExternalLink size={11} />
                            </Link>
                          </div>
                        )}
                      </td>

                      <td className="admin-text-muted">{r.category.name}</td>

                      <td>
                        <span className="admin-badge admin-badge-draft">
                          {r.picksCount} {r.picksCount === 1 ? 'pick' : 'picks'}
                        </span>
                      </td>

                      <td>
                        <StatusBadge status={r.status} />
                      </td>

                      <td style={{ textAlign: 'right' }}>
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
