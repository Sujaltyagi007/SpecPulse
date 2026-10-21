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

  if (normalized === 'published' || normalized === 'approved' || normalized === 'ok' || normalized === 'passes') {
    toneClass = 'admin-badge-ok';
  } else if (normalized === 'review' || normalized === 'warn' || normalized === 'generating') {
    toneClass = 'admin-badge-warn';
  } else if (normalized === 'archived' || normalized === 'err' || normalized === 'failed') {
    toneClass = 'admin-badge-err';
  }

  return (
    <span className={`admin-badge ${toneClass}`}>
      <span className="admin-badge-indicator" />
      {STATUS_LABELS[normalized] ?? status}
    </span>
  );
}

export function IssueBadge({ errors, warnings }: { errors: number; warnings: number }) {
  if (errors === 0 && warnings === 0) {
    return <span className="admin-badge admin-badge-ok">Passed all checks</span>;
  }
  if (errors > 0) {
    return (
      <span className="admin-badge admin-badge-err">
        {errors} {errors === 1 ? 'error' : 'errors'}
        {warnings > 0 ? ` · ${warnings} warn` : ''}
      </span>
    );
  }
  return (
    <span className="admin-badge admin-badge-warn">
      {warnings} {warnings === 1 ? 'warning' : 'warnings'}
    </span>
  );
}
