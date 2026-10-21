import React from 'react';

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties; }) {
  return <div className={`admin-skeleton ${className}`} style={style} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="admin-table-container">
      <table className="admin-table admin-skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <Skeleton style={{ height: 12, width: i === 0 ? 120 : 70 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} suppressHydrationWarning>
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
    <div className="admin-stats-grid">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="admin-stat-card">
          <Skeleton style={{ height: 12, width: 80 }} />
          <Skeleton style={{ height: 32, width: 60 }} />
        </div>
      ))}
    </div>
  );
}
