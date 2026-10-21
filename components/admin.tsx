'use client';
import { Fragment, useState } from 'react';
export { StatusBadge } from './admin/badge';
import { AlertDialog } from './admin/alert-dialog';
import type { PageType } from '@/lib/content/facts';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { generateContent } from '@/app/admin/content-actions';

export function ActionError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div style={{
      margin: '16px 0',
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: 'var(--admin-destructive-subtle, #fef2f2)',
      border: '1px solid var(--admin-destructive-border, #fecaca)',
      color: 'var(--admin-destructive, #ef4444)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      fontSize: '0.84375rem',
      lineHeight: 1.5,
    }} role="alert" >
      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{message}</div>
    </div>
  );
}

import { ContentGenerateModal } from './admin/content-generate-modal';

export function GenerateButton({ pageType, pageKey, back, hasCopy }: {
  pageType: PageType;
  pageKey: string;
  back: string;
  hasCopy: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Fragment>
      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen(true)}>
        <Sparkles size={14} />
        {hasCopy ? 'Regenerate copy' : 'Generate copy'}
      </button>

      <ContentGenerateModal
        open={open}
        onOpenChange={setOpen}
        pageType={pageType}
        pageKey={pageKey}
        back={back}
        hasCopy={hasCopy}
      />
    </Fragment>
  );
}
