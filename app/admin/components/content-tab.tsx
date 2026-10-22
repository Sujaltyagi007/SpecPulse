'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { formatDate } from '@/lib/site';
import { useTabData } from '@/lib/admin-cache';
import { getContentQueueData } from '../data-actions';
import { TableSkeleton } from '@/components/admin/skeleton';
import { EmptyState } from '@/components/admin/empty-state';
import { StatusBadge, IssueBadge } from '@/components/admin/badge';
import { FileText, RotateCw, Edit3, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';

export function ContentTab() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const cacheKey = `content-queue-${filterStatus}`;

  const fetcher = React.useCallback(() => {
    return getContentQueueData(filterStatus);
  }, [filterStatus]);

  const { data, isLoading, isRefreshing, error, refresh } = useTabData(cacheKey, fetcher, {
    ttlMs: 2 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} className="text-admin-accent" />
            Page Copy & Editorial Content
          </CardTitle>
          <CardDescription>
            AI-drafted editorial content generated strictly from verified specs and checked against ground-truth facts.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-admin-muted-bg rounded-admin border border-admin-border">
            <button
              onClick={() => setFilterStatus('all')}
              className={`text-xs px-2.5 py-1 rounded-admin font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-admin-surface text-admin-fg shadow-admin-sm font-semibold'
                  : 'text-admin-muted hover:text-admin-fg'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('review')}
              className={`text-xs px-2.5 py-1 rounded-admin font-medium transition-colors ${
                filterStatus === 'review'
                  ? 'bg-admin-surface text-admin-fg shadow-admin-sm font-semibold'
                  : 'text-admin-muted hover:text-admin-fg'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`text-xs px-2.5 py-1 rounded-admin font-medium transition-colors ${
                filterStatus === 'draft'
                  ? 'bg-admin-surface text-admin-fg shadow-admin-sm font-semibold'
                  : 'text-admin-muted hover:text-admin-fg'
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`text-xs px-2.5 py-1 rounded-admin font-medium transition-colors ${
                filterStatus === 'approved'
                  ? 'bg-admin-surface text-admin-fg shadow-admin-sm font-semibold'
                  : 'text-admin-muted hover:text-admin-fg'
              }`}
            >
              Approved
            </button>
          </div>

          <button
            onClick={() => refresh()}
            disabled={isRefreshing}
            className="admin-btn admin-btn-secondary admin-btn-sm"
            title="Refresh content"
          >
            <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </CardHeader>

      <CardContent noPadding>
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : error || !data ? (
          <div className="p-8">
            <EmptyState
              title="Failed to load page copy"
              description={error || 'An error occurred.'}
              action={
                <button onClick={() => refresh()} className="admin-btn admin-btn-secondary">
                  Retry
                </button>
              }
            />
          </div>
        ) : data.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<FileText size={24} className="text-admin-muted" />}
              title="No copy entries found"
              description="Generate copy from any product, comparison, or roundup page to inspect it here."
            />
          </div>
        ) : (
          <div className="admin-table-container w-full overflow-x-auto">
            <table className="admin-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-admin-border-subtle">
                  <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Page Key</th>
                  <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Fact Checks</th>
                  <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Generator Model</th>
                  <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Updated</th>
                  <th className="py-3 px-4 text-right font-semibold text-xs text-admin-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border-subtle">
                {data.map((r) => (
                  <tr key={r.id} className="hover:bg-admin-muted-bg/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/content/${r.id}`}
                        className="font-semibold text-sm text-admin-fg hover:text-admin-accent transition-colors no-underline"
                      >
                        {r.pageKey}
                      </Link>
                      {r.reviewedBy && (
                        <div className="text-xs text-admin-muted mt-0.5">
                          Approved by {r.reviewedBy}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="admin-badge admin-badge-draft inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-muted-bg text-admin-muted border border-admin-border">
                        {r.pageType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} />
                    </td>

                    <td className="py-3.5 px-4">
                      <IssueBadge errors={r.validationErrors.length} warnings={0} />
                      {r.validationErrors.length > 0 && (
                        <div className="mt-1 text-xs text-admin-destructive">
                          • {r.validationErrors[0]}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-admin-muted text-xs font-mono">
                      {r.generator ? (
                        <div>
                          <div>{r.generator}</div>
                          {r.promptVersion && <div className="text-[0.6875rem]">prompt {r.promptVersion}</div>}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-admin-muted text-xs">{formatDate(new Date(r.updatedAt))}</td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/content/${r.id}`}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        title="Edit and verify copy"
                      >
                        <Edit3 size={13} />
                        Review Copy
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
  );
}
