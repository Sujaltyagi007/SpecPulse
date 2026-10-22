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
    <div className="pb-12 max-w-7xl mx-auto flex flex-col gap-6">
      <nav className="admin-breadcrumb flex items-center gap-1.5 text-xs text-admin-muted">
        <Link href="/admin" className="hover:text-admin-fg transition-colors">Console</Link>
        <span className="text-admin-muted/60">/</span>
        <Link href="/admin?tab=content" className="hover:text-admin-fg transition-colors">Page Copy</Link>
        <span className="text-admin-muted/60">/</span>
        <span className="text-admin-fg font-medium capitalize">{row.pageType}</span>
      </nav>

      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-admin-border-subtle">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-admin-fg m-0 font-mono text-lg sm:text-2xl">{row.pageKey}</h1>
            <StatusBadge status={row.status} />
            <IssueBadge errors={errors.length} warnings={0} />
          </div>

          <div className="text-xs text-admin-muted flex flex-wrap items-center gap-2">
            <span>Type: <span className="font-medium text-admin-fg capitalize">{row.pageType}</span></span>
            <span>·</span>
            <span>Model: <span className="font-medium text-admin-fg">{row.generator ?? 'unknown'}</span></span>
            <span>·</span>
            <span>Updated: {formatDate(new Date(row.updatedAt))}</span>
            {row.reviewedBy && (
              <>
                <span>·</span>
                <span className="text-admin-ok font-medium">Approved by {row.reviewedBy}</span>
              </>
            )}
          </div>
        </div>

        <div className="admin-header-actions flex flex-wrap items-center gap-2 shrink-0">
          <form className="flex items-center gap-2">
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
              <ConfirmFormButton
                className="admin-btn admin-btn-outline"
                dialogTitle="Reject & Send to Draft?"
                dialogDescription="Return this copy to draft status for further revision?"
                confirmText="Send to Draft"
                tone="destructive"
                formAction={rejectContent}
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
              <form action={saveContent} className="grid gap-5">
                <input type="hidden" name="id" value={row.id} />

                <div className="admin-form-group flex flex-col gap-1.5">
                  <label className="admin-label font-medium text-xs text-admin-fg">Summary (Answer-first Lead Paragraph)</label>
                  <textarea
                    name="summary"
                    rows={3}
                    className="admin-textarea w-full text-sm leading-relaxed"
                    defaultValue={row.summary ?? ''}
                    placeholder="Concise overview summarizing the product or guide..."
                  />
                  <span className="admin-form-hint text-[11px] text-admin-muted leading-tight mt-0.5">
                    Displayed at the top of the page and in meta descriptions.
                  </span>
                </div>

                <div className="admin-form-group flex flex-col gap-1.5">
                  <label className="admin-label font-medium text-xs text-admin-fg">Body Content (Markdown paragraphs separated by a blank line)</label>
                  <textarea
                    name="body"
                    rows={12}
                    className="admin-textarea w-full font-mono text-xs leading-relaxed"
                    defaultValue={row.bodyMd ?? ''}
                    placeholder="Full body article content..."
                  />
                </div>

                <div className="admin-form-group flex flex-col gap-1.5">
                  <label className="admin-label font-medium text-xs text-admin-fg">Frequently Asked Questions (JSON list of &#123;&quot;question&quot;, &quot;answer&quot;&#125;)</label>
                  <textarea
                    name="faq"
                    rows={8}
                    className="admin-textarea w-full font-mono text-xs leading-relaxed"
                    defaultValue={JSON.stringify(row.faq, null, 2)}
                  />
                  <span className="admin-form-hint text-[11px] text-admin-muted leading-tight mt-0.5">
                    Validated against schema format: array of objects with question and answer strings.
                  </span>
                </div>

                <div className="pt-2">
                  <ConfirmFormButton
                    className="admin-btn admin-btn-primary"
                    dialogTitle="Save Copy and Re-check?"
                    dialogDescription="Save your copy edits? The script will immediately re-verify claims against ground-truth database facts."
                    confirmText="Save & Re-check"
                  >
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
                <div className="flex items-center gap-3 p-4 rounded-admin-lg bg-admin-ok-subtle border border-admin-ok-border text-admin-ok">
                  <CheckCircle2 size={24} className="shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Passed All Automated Checks</div>
                    <div className="text-xs text-admin-muted mt-0.5">
                      No invented specs, hallucinated prices, or unauthorized claims detected in this copy.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="p-3.5 rounded-admin-lg bg-admin-destructive-subtle border border-admin-destructive-border text-admin-destructive text-sm font-semibold">
                    Found {errors.length} validation {errors.length === 1 ? 'issue' : 'issues'} that must be corrected:
                  </div>

                  <ul className="m-0 pl-5 text-xs leading-relaxed space-y-1">
                    {errors.map((e, idx) => (
                      <li key={idx} className="text-admin-destructive font-medium">
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
              <pre className="m-0 p-5 bg-admin-muted-bg text-admin-fg font-mono text-xs leading-relaxed overflow-x-auto rounded-b-admin-xl">
                {JSON.stringify(facts, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
