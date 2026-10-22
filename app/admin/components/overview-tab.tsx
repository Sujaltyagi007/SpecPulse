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
    <div className="flex flex-col gap-6">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-admin-fg m-0">
            System Pulse & Metrics
          </h2>
          <p className="text-xs text-admin-muted mt-1 mb-0">
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
      <div className="admin-stats-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="admin-stat-card bg-admin-surface border border-admin-border rounded-admin-lg p-4 shadow-admin-sm flex flex-col gap-1.5">
          <div className="admin-stat-label flex items-center justify-between text-xs text-admin-muted font-medium">
            <span>Total Catalog</span>
            <Layers size={14} />
          </div>
          <AnimatedNumber value={totalProducts} className="admin-stat-value text-2xl font-bold tracking-tight text-admin-fg" />
          <div className="admin-stat-subtext text-[0.6875rem] text-admin-muted">Catalog products registered</div>
        </div>

        <div className="admin-stat-card bg-admin-surface border border-admin-border rounded-admin-lg p-4 shadow-admin-sm flex flex-col gap-1.5">
          <div className="admin-stat-label flex items-center justify-between text-xs text-admin-muted font-medium">
            <span>In Review</span>
            <span className="admin-badge-indicator w-2 h-2 rounded-full bg-admin-warn" />
          </div>
          <AnimatedNumber value={counts.review ?? 0} className={`admin-stat-value text-2xl font-bold tracking-tight ${counts.review ? 'text-admin-warn' : 'text-admin-fg'}`} />
          <div className="admin-stat-subtext text-[0.6875rem] text-admin-muted">Awaiting editorial sign-off</div>
        </div>

        <div className="admin-stat-card bg-admin-surface border border-admin-border rounded-admin-lg p-4 shadow-admin-sm flex flex-col gap-1.5">
          <div className="admin-stat-label flex items-center justify-between text-xs text-admin-muted font-medium">
            <span>Approved</span>
            <span className="admin-badge-indicator w-2 h-2 rounded-full bg-admin-ok" />
          </div>
          <AnimatedNumber value={counts.approved ?? 0} className="admin-stat-value text-2xl font-bold tracking-tight text-admin-fg" />
          <div className="admin-stat-subtext text-[0.6875rem] text-admin-muted">Queued for paced publishing</div>
        </div>

        <div className="admin-stat-card bg-admin-surface border border-admin-border rounded-admin-lg p-4 shadow-admin-sm flex flex-col gap-1.5">
          <div className="admin-stat-label flex items-center justify-between text-xs text-admin-muted font-medium">
            <span>Published</span>
            <CheckCircle2 size={14} className="text-admin-ok" />
          </div>
          <AnimatedNumber value={counts.published ?? 0} className="admin-stat-value text-2xl font-bold tracking-tight text-admin-ok" />
          <div className="admin-stat-subtext text-[0.6875rem] text-admin-muted">Live on canonical routes</div>
        </div>

        <div className="admin-stat-card bg-admin-surface border border-admin-border rounded-admin-lg p-4 shadow-admin-sm flex flex-col gap-1.5">
          <div className="admin-stat-label flex items-center justify-between text-xs text-admin-muted font-medium">
            <span>Drafts</span>
            <span className="admin-badge-indicator w-2 h-2 rounded-full bg-admin-muted" />
          </div>
          <AnimatedNumber value={counts.draft ?? 0} className="admin-stat-value text-2xl font-bold tracking-tight text-admin-fg" />
          <div className="admin-stat-subtext text-[0.6875rem] text-admin-muted">Ingested / pending specs</div>
        </div>
      </div>

      {/* Ingest Runs Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database size={17} className="text-admin-accent" />
              Recent Ingest Runs
            </CardTitle>
            <CardDescription>Price refresh and scraping jobs run by cron or scripts</CardDescription>
          </div>
        </CardHeader>
        <CardContent noPadding>
          {runs.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No Ingest Runs Recorded" description="Scheduled scraper or price refreshes will appear here." />
            </div>
          ) : (
            <div className="admin-table-container w-full overflow-x-auto">
              <table className="admin-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-admin-border-subtle">
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Job Name</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Started</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Success</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Failed</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">SerpApi Calls</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Status / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border-subtle">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-admin-muted-bg/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-sm text-admin-fg">{r.job}</td>
                      <td className="py-3 px-4 text-xs text-admin-muted">{formatDate(new Date(r.startedAt))}</td>
                      <td className="py-3 px-4">
                        <span className="admin-badge admin-badge-ok inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-ok-subtle text-admin-ok border border-admin-ok-border">{r.itemsOk} items</span>
                      </td>
                      <td className="py-3 px-4">
                        {r.itemsFailed > 0 ? (
                          <span className="admin-badge admin-badge-err inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-destructive-subtle text-admin-destructive border border-admin-destructive-border">{r.itemsFailed} failed</span>
                        ) : (
                          <span className="text-xs text-admin-muted">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-admin-muted font-mono">{r.apiCalls} calls</td>
                      <td className="py-3 px-4 text-xs">
                        {r.error ? (
                          <span className="admin-badge admin-badge-err inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-destructive-subtle text-admin-destructive border border-admin-destructive-border" title={r.error}>
                            {r.error.slice(0, 32)}...
                          </span>
                        ) : r.finishedAt ? (
                          <span className="admin-badge admin-badge-ok inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-ok-subtle text-admin-ok border border-admin-ok-border">completed</span>
                        ) : (
                          <span className="admin-badge admin-badge-warn inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-warn-subtle text-admin-warn border border-admin-warn-border">in progress</span>
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
            <CardTitle className="flex items-center gap-2">
              <Cpu size={17} className="text-admin-ok" />
              LLM Usage (Last 7 Days)
            </CardTitle>
            <CardDescription>
              Calls and token consumption per provider, model, and key in the generation pool
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent noPadding>
          {llmUsage.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No LLM Calls In Last 7 Days" description="Generated page copy records will display usage here." />
            </div>
          ) : (
            <div className="admin-table-container w-full overflow-x-auto">
              <table className="admin-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-admin-border-subtle">
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Model (Key)</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Successful</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Failed</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Input Tokens</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Output Tokens</th>
                    <th className="py-3 px-4 font-semibold text-xs text-admin-muted uppercase tracking-wider">Total Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border-subtle">
                  {llmUsage.map((r) => (
                    <tr key={r.key} className="hover:bg-admin-muted-bg/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-sm text-admin-fg">{r.label}</td>
                      <td className="py-3 px-4">
                        <span className="admin-badge admin-badge-ok inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-ok-subtle text-admin-ok border border-admin-ok-border">{r.ok} calls</span>
                      </td>
                      <td className="py-3 px-4">
                        {r.failed > 0 ? (
                          <span className="admin-badge admin-badge-err inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-admin-destructive-subtle text-admin-destructive border border-admin-destructive-border">{r.failed} errors</span>
                        ) : (
                          <span className="text-xs text-admin-muted">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-admin-muted">{r.inTok.toLocaleString('en-US')}</td>
                      <td className="py-3 px-4 font-mono text-xs text-admin-muted">{r.outTok.toLocaleString('en-US')}</td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-admin-fg">
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
