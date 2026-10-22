import React from 'react';

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties; }) {
  return <div className={`admin-skeleton animate-pulse bg-admin-muted-bg/80 rounded-admin ${className}`} style={style} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="admin-table-container w-full overflow-x-auto rounded-admin-lg border border-admin-border bg-admin-surface">
      <table className="admin-table admin-skeleton-table w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-admin-border-subtle">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-3 px-4">
                <Skeleton style={{ height: 12, width: i === 0 ? 120 : 70 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-border-subtle">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="py-3.5 px-4" suppressHydrationWarning>
                  <Skeleton style={{ height: 16, width: c === 0 ? '75%' : '40%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="admin-stats-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="admin-stat-card bg-admin-surface border border-admin-border rounded-admin-lg p-4 shadow-admin-sm flex flex-col gap-2.5">
          <Skeleton style={{ height: 12, width: 80 }} />
          <Skeleton style={{ height: 32, width: 60 }} />
        </div>
      ))}
    </div>
  );
}
