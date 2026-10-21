'use client';
import { formatDate } from '@/lib/site';
import { useTabData } from '@/lib/admin-cache';
import { getAdminOverview } from '../data-actions';
import { useToast } from '@/components/admin/toast';
import { AnimatedNumber } from '@/components/admin/motion';
import { EmptyState } from '@/components/admin/empty-state';
import { StatsSkeleton, TableSkeleton } from '@/components/admin/skeleton';
import { RotateCw, Cpu, Database, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';

export function OverviewTab() {
  const { toast } = useToast();
  const { data, isLoading, isRefreshing, error, refresh } = useTabData('admin-overview', getAdminOverview);

  const handleRefresh = async () => {
    await refresh();
    toast.info('Overview data refreshed');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <StatsSkeleton />
        <Card>
          <CardHeader>
            <CardTitle>Recent Ingest Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={4} cols={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<AlertTriangle size={24} style={{ color: 'var(--admin-destructive)' }} />}
        title="Failed to load overview"
        description={error || 'Unable to load system overview metrics.'}
        action={
          <button onClick={handleRefresh} className="admin-btn admin-btn-secondary">
            <RotateCw size={14} /> Try again
          </button>
        }
      />
    );
  }

  const { counts, runs, llmUsage, totalProducts } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top action row */}
      <div className="admin-flex admin-items-center admin-justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--admin-fg)' }}>
            System Pulse & Metrics
          </h2>
          <p className="admin-text-sm admin-text-muted" style={{ margin: '4px 0 0' }}>
            Product lifecycle breakdown, automated ingest history, and AI copy generation consumption
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="admin-btn admin-btn-secondary admin-btn-sm"
          title="Refresh metrics"
        >
          <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>Total Catalog</span>
            <Layers size={14} />
          </div>
          <AnimatedNumber value={totalProducts} className="admin-stat-value" />
          <div className="admin-stat-subtext">Catalog products registered</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>In Review</span>
            <span className="admin-badge-indicator" style={{ backgroundColor: 'var(--admin-warn)' }} />
          </div>
          <AnimatedNumber value={counts.review ?? 0} className="admin-stat-value" style={{ color: counts.review ? 'var(--admin-warn)' : undefined }} />
          <div className="admin-stat-subtext">Awaiting editorial sign-off</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>Approved</span>
            <span className="admin-badge-indicator" style={{ backgroundColor: 'var(--admin-ok)' }} />
          </div>
          <AnimatedNumber value={counts.approved ?? 0} className="admin-stat-value" />
          <div className="admin-stat-subtext">Queued for paced publishing</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>Published</span>
            <CheckCircle2 size={14} style={{ color: 'var(--admin-ok)' }} />
          </div>
          <AnimatedNumber value={counts.published ?? 0} className="admin-stat-value" style={{ color: 'var(--admin-ok)' }} />
          <div className="admin-stat-subtext">Live on canonical routes</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">
            <span>Drafts</span>
            <span className="admin-badge-indicator" style={{ backgroundColor: 'var(--admin-muted)' }} />
          </div>
          <AnimatedNumber value={counts.draft ?? 0} className="admin-stat-value" />
          <div className="admin-stat-subtext">Ingested / pending specs</div>
        </div>
      </div>

      {/* Ingest Runs Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={17} style={{ color: 'var(--admin-accent)' }} />
              Recent Ingest Runs
            </CardTitle>
            <CardDescription>Price refresh and scraping jobs run by cron or scripts</CardDescription>
          </div>
        </CardHeader>
        <CardContent noPadding>
          {runs.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState title="No Ingest Runs Recorded" description="Scheduled scraper or price refreshes will appear here." />
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Job Name</th>
                    <th>Started</th>
                    <th>Success</th>
                    <th>Failed</th>
                    <th>SerpApi Calls</th>
                    <th>Status / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.job}</td>
                      <td className="admin-text-muted">{formatDate(new Date(r.startedAt))}</td>
                      <td>
                        <span className="admin-badge admin-badge-ok">{r.itemsOk} items</span>
                      </td>
                      <td>
                        {r.itemsFailed > 0 ? (
                          <span className="admin-badge admin-badge-err">{r.itemsFailed} failed</span>
                        ) : (
                          <span className="admin-text-muted">0</span>
                        )}
                      </td>
                      <td>{r.apiCalls} calls</td>
                      <td>
                        {r.error ? (
                          <span className="admin-badge admin-badge-err" title={r.error}>
                            {r.error.slice(0, 32)}...
                          </span>
                        ) : r.finishedAt ? (
                          <span className="admin-badge admin-badge-ok">completed</span>
                        ) : (
                          <span className="admin-badge admin-badge-warn">in progress</span>
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

      {/* LLM Usage Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={17} style={{ color: 'var(--admin-ok)' }} />
              LLM Usage (Last 7 Days)
            </CardTitle>
            <CardDescription>
              Calls and token consumption per provider, model, and key in the generation pool
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent noPadding>
          {llmUsage.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState title="No LLM Calls In Last 7 Days" description="Generated page copy records will display usage here." />
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Model (Key)</th>
                    <th>Successful</th>
                    <th>Failed</th>
                    <th>Input Tokens</th>
                    <th>Output Tokens</th>
                    <th>Total Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {llmUsage.map((r) => (
                    <tr key={r.key}>
                      <td style={{ fontWeight: 600 }}>{r.label}</td>
                      <td>
                        <span className="admin-badge admin-badge-ok">{r.ok} calls</span>
                      </td>
                      <td>
                        {r.failed > 0 ? (
                          <span className="admin-badge admin-badge-err">{r.failed} errors</span>
                        ) : (
                          <span className="admin-text-muted">0</span>
                        )}
                      </td>
                      <td className="admin-font-mono admin-text-sm">{r.inTok.toLocaleString('en-US')}</td>
                      <td className="admin-font-mono admin-text-sm">{r.outTok.toLocaleString('en-US')}</td>
                      <td className="admin-font-mono admin-text-sm" style={{ fontWeight: 600 }}>
                        {(r.inTok + r.outTok).toLocaleString('en-US')}
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
