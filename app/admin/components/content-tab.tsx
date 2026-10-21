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
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--admin-accent)' }} />
            Page Copy & Editorial Content
          </CardTitle>
          <CardDescription>
            AI-drafted editorial content generated strictly from verified specs and checked against ground-truth facts.
          </CardDescription>
        </div>

        <div className="admin-flex admin-items-center admin-gap-2">
          {/* Status Filter */}
          <div style={{ display: 'flex', background: 'var(--admin-muted-bg)', padding: 3, borderRadius: 6, gap: 2 }}>
            <button
              onClick={() => setFilterStatus('all')}
              className={`admin-btn admin-btn-sm ${filterStatus === 'all' ? 'admin-btn-secondary' : 'admin-btn-ghost'}`}
              style={{ padding: '4px 8px' }}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('review')}
              className={`admin-btn admin-btn-sm ${filterStatus === 'review' ? 'admin-btn-secondary' : 'admin-btn-ghost'}`}
              style={{ padding: '4px 8px' }}
            >
              Review
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`admin-btn admin-btn-sm ${filterStatus === 'draft' ? 'admin-btn-secondary' : 'admin-btn-ghost'}`}
              style={{ padding: '4px 8px' }}
            >
              Drafts
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`admin-btn admin-btn-sm ${filterStatus === 'approved' ? 'admin-btn-secondary' : 'admin-btn-ghost'}`}
              style={{ padding: '4px 8px' }}
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
          <div style={{ padding: 24 }}>
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : error || !data ? (
          <div style={{ padding: 32 }}>
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
          <div style={{ padding: 40 }}>
            <EmptyState
              icon={<FileText size={24} style={{ color: 'var(--admin-muted)' }} />}
              title="No copy entries found"
              description="Generate copy from any product, comparison, or roundup page to inspect it here."
            />
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Page Key</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Fact Checks</th>
                  <th>Generator Model</th>
                  <th>Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/admin/content/${r.id}`}
                        style={{
                          fontWeight: 600,
                          color: 'var(--admin-fg)',
                          textDecoration: 'none',
                        }}
                      >
                        {r.pageKey}
                      </Link>
                      {r.reviewedBy && (
                        <div className="admin-text-xs admin-text-muted" style={{ marginTop: 2 }}>
                          Approved by {r.reviewedBy}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="admin-badge admin-badge-draft">{r.pageType}</span>
                    </td>

                    <td>
                      <StatusBadge status={r.status} />
                    </td>

                    <td>
                      <IssueBadge errors={r.validationErrors.length} warnings={0} />
                      {r.validationErrors.length > 0 && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: '0.75rem',
                            color: 'var(--admin-destructive)',
                          }}
                        >
                          • {r.validationErrors[0]}
                        </div>
                      )}
                    </td>

                    <td className="admin-text-muted admin-text-xs">
                      {r.generator ? (
                        <div>
                          <div>{r.generator}</div>
                          {r.promptVersion && <div>prompt {r.promptVersion}</div>}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="admin-text-muted admin-text-xs">{formatDate(new Date(r.updatedAt))}</td>

                    <td style={{ textAlign: 'right' }}>
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
