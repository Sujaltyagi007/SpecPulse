'use client';
import { Fragment, useState } from 'react';
export { StatusBadge } from './admin/badge';
import type { PageType } from '@/lib/content/facts';
import { Sparkles, AlertCircle } from 'lucide-react';

export function ActionError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="my-4 flex items-start gap-2.5 rounded-lg border border-admin-destructive-border bg-admin-destructive-subtle px-4 py-3 text-[0.84375rem] leading-6 text-admin-destructive" role="alert">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 whitespace-pre-wrap">{message}</div>
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
      <ContentGenerateModal open={open} onOpenChange={setOpen} pageType={pageType} pageKey={pageKey} back={back} hasCopy={hasCopy} />
    </Fragment>
  );
}
