export const STATUS_LABELS: Record<string, string> = {
  draft: 'Needs work',
  review: 'In review',
  approved: 'Scheduled',
  published: 'Live',
  archived: 'Archived',
  generating: 'Generating',
  failed: 'Failed',
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let toneClass = 'admin-badge-draft';
  let toneClasses = 'bg-admin-muted-bg text-admin-muted border-admin-border';
  let dotClasses = 'bg-admin-muted';

  if (normalized === 'published' || normalized === 'approved' || normalized === 'ok' || normalized === 'passes') {
    toneClass = 'admin-badge-ok';
    toneClasses = 'bg-admin-ok-subtle/50 text-admin-ok border-admin-ok-border/60';
    dotClasses = 'bg-admin-ok shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  } else if (normalized === 'review' || normalized === 'warn' || normalized === 'generating') {
    toneClass = 'admin-badge-warn';
    toneClasses = 'bg-admin-warn-subtle/50 text-admin-warn border-admin-warn-border/60';
    dotClasses = 'bg-admin-warn shadow-[0_0_8px_rgba(245,158,11,0.5)]';
  } else if (normalized === 'archived' || normalized === 'err' || normalized === 'failed') {
    toneClass = 'admin-badge-err';
    toneClasses = 'bg-admin-destructive-subtle/50 text-admin-destructive border-admin-destructive-border/60';
    dotClasses = 'bg-admin-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  }

  return (
    <span className={`admin-badge ${toneClass} inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${toneClasses}`}>
      <span className={`admin-badge-indicator inline-block h-1.5 w-1.5 rounded-full ${dotClasses}`} />
      {STATUS_LABELS[normalized] ?? status}
    </span>
  );
}

export function IssueBadge({ errors, warnings }: { errors: number; warnings: number }) {
  if (errors === 0 && warnings === 0) {
    return <span className="admin-badge admin-badge-ok inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-admin-ok-border/60 bg-admin-ok-subtle/50 text-admin-ok">Passed all checks</span>;
  }
  if (errors > 0) {
    return (
      <span className="admin-badge admin-badge-err inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-admin-destructive-border/60 bg-admin-destructive-subtle/50 text-admin-destructive">
        {errors} {errors === 1 ? 'error' : 'errors'}
        {warnings > 0 ? ` · ${warnings} warn` : ''}
      </span>
    );
  }
  return (
    <span className="admin-badge admin-badge-warn inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-admin-warn-border/60 bg-admin-warn-subtle/50 text-admin-warn">
      {warnings} {warnings === 1 ? 'warning' : 'warnings'}
    </span>
  );
}
