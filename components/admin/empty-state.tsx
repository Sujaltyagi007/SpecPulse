import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="admin-empty-state flex flex-col items-center justify-center rounded-admin border border-dashed border-admin-border p-10 text-center">
      <div className="admin-empty-icon mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-admin-muted-bg text-admin-muted">
        {icon ?? <PackageOpen size={24} />}
      </div>
      <h3 className="admin-empty-title text-base font-semibold text-admin-fg">{title}</h3>
      {description && <p className="admin-empty-desc mt-1 max-w-sm text-sm text-admin-muted">{description}</p>}
      {action && <div className="admin-empty-action mt-4">{action}</div>}
    </div>
  );
}
