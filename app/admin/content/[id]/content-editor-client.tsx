'use client';
import Link from 'next/link';
import { useState } from 'react';
import { formatDate } from '@/lib/site';
import { ActionError, GenerateButton } from '@/components/admin';
import { StatusBadge, IssueBadge } from '@/components/admin/badge';
import { ConfirmFormButton } from '@/components/admin/alert-dialog';
import { Edit3, ShieldCheck, Database, CheckCircle2, Save } from 'lucide-react';
import { approveContent, rejectContent, saveContent } from '../../content-actions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/admin/card';

export function ContentEditorClient({ row, facts, error }: { row: any; facts: any; error?: string; }) {
  const [activeTab, setActiveTab] = useState('editor');
  const errors = (row.validationErrors as string[]) || [];
  const back = `/admin/content/${row.id}`;

  return (
    <div style={{ paddingBottom: 48 }}>
      <nav className="admin-breadcrumb">
        <Link href="/admin">Console</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <Link href="/admin">Page Copy</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <span>{row.pageType}</span>
      </nav>

      <div className="admin-page-header">
        <div>
          <div className="admin-flex admin-items-center admin-gap-3" style={{ marginBottom: 6 }}>
            <h1 className="admin-page-title">{row.pageKey}</h1>
            <StatusBadge status={row.status} />
            <IssueBadge errors={errors.length} warnings={0} />
          </div>

          <div className="admin-text-sm admin-text-muted admin-flex admin-items-center admin-gap-3">
            <span>Type: {row.pageType}</span>
            <span>·</span>
            <span>Model: {row.generator ?? 'unknown'}</span>
            <span>·</span>
            <span>Updated: {formatDate(new Date(row.updatedAt))}</span>
            {row.reviewedBy && (
              <>
                <span>·</span>
                <span style={{ color: 'var(--admin-ok)' }}>Approved by {row.reviewedBy}</span>
              </>
            )}
          </div>
        </div>

        <div className="admin-header-actions">
          <form className="admin-flex admin-items-center admin-gap-2">
            <input type="hidden" name="id" value={row.id} />
            {row.status === 'review' && (
              <ConfirmFormButton
                className="admin-btn admin-btn-primary"
                dialogTitle="Approve Editorial Copy?"
                dialogDescription="Approve this copy for publishing? Ground-truth checks will be verified against today's database facts."
                confirmText="Approve Copy"
                formAction={approveContent}
              >
                <CheckCircle2 size={14} />
                Approve Copy
              </ConfirmFormButton>
            )}

            {(row.status === 'review' || row.status === 'approved') && (
              <ConfirmFormButton className="admin-btn admin-btn-outline"
                dialogTitle="Reject & Send to Draft?"
                dialogDescription="Return this copy to draft status for further revision?"
                confirmText="Send to Draft" tone="destructive" formAction={rejectContent}
              >
                Back to Draft
              </ConfirmFormButton>
            )}
          </form>

          <GenerateButton pageType={row.pageType} pageKey={row.pageKey} back={back} hasCopy={true} />
        </div>
      </div>

      <ActionError message={error} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor" icon={<Edit3 size={14} />}>
            Copy Editor
          </TabsTrigger>
          <TabsTrigger value="checks" icon={<ShieldCheck size={14} />} badge={errors.length > 0 ? errors.length : null}>
            Scripted Fact Checks
          </TabsTrigger>
          <TabsTrigger value="facts" icon={<Database size={14} />}>
            Fact Sheet Given to Writer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Editorial Content</CardTitle>
                <CardDescription>
                  Before approving, check every claim against the ground-truth facts. Saving re-runs automated validation
                  and catches unverified numbers, fabricated claims, or broken links.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form action={saveContent} style={{ display: 'grid', gap: 20 }}>
                <input type="hidden" name="id" value={row.id} />

                <div className="admin-form-group">
                  <label className="admin-label">Summary (Answer-first Lead Paragraph)</label>
                  <textarea name="summary" rows={3} className="admin-textarea" defaultValue={row.summary ?? ''} placeholder="Concise overview summarizing the product or guide..." />
                  <span className="admin-form-hint">Displayed at the top of the page and in meta descriptions.</span>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Body Content (Markdown paragraphs separated by a blank line)</label>
                  <textarea name="body" rows={12} className="admin-textarea" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.84375rem' }} defaultValue={row.bodyMd ?? ''} placeholder="Full body article content..." />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Frequently Asked Questions (JSON list of &#123;"question", "answer"&#125;)</label>
                  <textarea name="faq" rows={8} className="admin-textarea" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8125rem' }} defaultValue={JSON.stringify(row.faq, null, 2)} />
                  <span className="admin-form-hint">Validated against schema format: array of objects with question and answer strings.</span>
                </div>

                <div>
                  <ConfirmFormButton className="admin-btn admin-btn-primary" dialogTitle="Save Copy and Re-check?" dialogDescription="Save your copy edits? The script will immediately re-verify claims against ground-truth database facts." confirmText="Save & Re-check">
                    <Save size={14} />
                    Save Changes & Re-check
                  </ConfirmFormButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Scripted Verification Report</CardTitle>
                <CardDescription>
                  Automated checks comparing claims in the copy against verified product specifications and live prices.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {errors.length === 0 ? (
                <div className="admin-flex admin-items-center admin-gap-3" style={{ color: 'var(--admin-ok)', padding: 16 }}>
                  <CheckCircle2 size={24} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Passed All Automated Checks</div>
                    <div className="admin-text-sm admin-text-muted">
                      No invented specs, hallucinated prices, or unauthorized claims detected in this copy.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: 'var(--admin-destructive-subtle)', border: '1px solid var(--admin-destructive-border)', color: 'var(--admin-destructive)', fontSize: '0.875rem', fontWeight: 600, }}>
                    Found {errors.length} validation {errors.length === 1 ? 'issue' : 'issues'} that must be corrected:
                  </div>

                  <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                    {errors.map((e, idx) => (
                      <li key={idx} style={{ color: 'var(--admin-destructive)', fontSize: '0.84375rem' }}>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facts">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Ground-Truth Fact Sheet</CardTitle>
                <CardDescription>The structured JSON payload provided to the LLM during generation. Any claim not in this sheet is rejected by fact checks.</CardDescription>
              </div>
            </CardHeader>
            <CardContent noPadding>
              <pre style={{ margin: 0, padding: 20, backgroundColor: 'var(--admin-muted-bg)', fontSize: '0.8125rem', lineHeight: 1.5, overflowX: 'auto', fontFamily: 'ui-monospace, monospace', color: 'var(--admin-fg)', }}>
                {JSON.stringify(facts, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
