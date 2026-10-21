import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({  icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; }) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-icon">{icon ?? <PackageOpen size={24} />}</div>
      <h3 className="admin-empty-title">{title}</h3>
      {description && <p className="admin-empty-desc">{description}</p>}
      {action && <div className="admin-empty-action">{action}</div>}
    </div>
  );
}
