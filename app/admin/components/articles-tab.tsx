'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, FileText, Loader2, RotateCw, Sparkles, Trash2, Wand2, Compass, Globe, PenTool, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { useTabData } from '@/lib/admin-cache';
import { useToast } from '@/components/admin/toast';
import { StatusBadge } from '@/components/admin/badge';
import { EmptyState } from '@/components/admin/empty-state';
import { useConfirm } from '@/components/admin/alert-dialog';
import { TableSkeleton } from '@/components/admin/skeleton';
import { MotionButton, softSpring, spring } from '@/components/admin/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/card';
import { apiDeleteArticle, apiStartArticle, getArticlesData, type ArticleListItem } from '../article-actions';

const STEPS = [
  { key: 'topic', label: 'Topic Strategy', icon: <Compass size={11} /> },
  { key: 'research', label: 'Web Research', icon: <Globe size={11} /> },
  { key: 'writing', label: 'Drafting Copy', icon: <PenTool size={11} /> },
  { key: 'image', label: 'Studio Banner', icon: <ImageIcon size={11} /> },
  { key: 'checks', label: 'Fact Checks', icon: <ShieldCheck size={11} /> },
] as const;

/** Live step indicator for an article that is still generating. */
function Progress({ step }: { step: string | null }) {
  const current = Math.max(0, STEPS.findIndex((s) => s.key === step));
  return (
    <div className="admin-article-steps" aria-label={`Generating: ${STEPS[current]?.label}`}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.key} className={`admin-article-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <motion.span className="admin-article-step-dot" layout transition={spring}>
              {done ? (
                <Check size={11} />
              ) : active ? (
                <span style={{ display: 'inline-grid', placeItems: 'center', animation: 'gen-pulse-aura 1.5s infinite ease-in-out' }}>
                  {s.icon}
                </span>
              ) : (
                <span style={{ opacity: 0.5 }}>{s.icon}</span>
              )}
            </motion.span>
            <span>{s.label}</span>
            {active && (
              <span className="admin-gen-dots" style={{ marginLeft: 2 }}>
                <span />
                <span />
                <span />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GenerateDialog({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (id: number) => void }) {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    const res = await apiStartArticle(topic);
    setBusy(false);
    if (!res.ok) return toast.error('Could not start', res.error);
    toast.success('Generating article', topic ? `Researching "${topic}"…` : 'Picking a topic from your catalog…');
    setTopic('');
    onStarted(res.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="admin-dialog-backdrop" onClick={() => !busy && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="admin-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gen-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <div className="admin-dialog-header">
              <motion.div className="admin-dialog-icon primary" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.08 }}>
                <Wand2 size={20} />
              </motion.div>
              <div style={{ flex: 1 }}>
                <h3 id="gen-title" className="admin-dialog-title">Generate an article</h3>
                <p className="admin-dialog-description">
                  The AI researches the topic on the web, writes a cited draft from that research and your verified specs, and makes a
                  cover image. You review it before anything is published.
                </p>
              </div>
            </div>
            <div className="admin-form-group" style={{ marginTop: 16 }}>
              <label className="admin-label" htmlFor="article-topic">Topic (optional)</label>
              <input
                id="article-topic"
                className="admin-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !busy && start()}
                placeholder="e.g. How to choose noise-cancelling earbuds for flights"
                autoFocus
                maxLength={300}
              />
              <span className="admin-form-hint">Leave blank and the AI picks a topic that fits your catalog.</span>
            </div>
            <div className="admin-dialog-footer">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={start} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ArticlesTab() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isRefreshing, error, refresh, updateData } = useTabData('admin-articles', getArticlesData, { ttlMs: 30_000 });

  // Poll while anything is generating so progress and the finished draft appear by themselves.
  const generating = data?.some((a) => a.status === 'generating') ?? false;
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => refresh(), 2500);
    return () => clearInterval(t);
  }, [generating, refresh]);

  const remove = async (a: ArticleListItem) => {
    const ok = await confirm({
      title: 'Delete article?',
      description: `"${a.title ?? a.topic ?? 'Untitled'}" will be deleted${a.status === 'published' ? ' and removed from the site' : ''}. This can't be undone.`,
      confirmText: 'Delete',
      tone: 'destructive',
    });
    if (!ok) return;
    const res = await apiDeleteArticle(a.id);
    if (!res.ok) return toast.error('Could not delete', res.error);
    toast.success('Article deleted');
    updateData((prev) => (prev ?? []).filter((x) => x.id !== a.id));
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--admin-accent)' }} />
            Articles
          </CardTitle>
          <CardDescription>AI researches and drafts with sources and a cover image. You review, edit and publish.</CardDescription>
        </div>
        <div className="admin-flex admin-items-center admin-gap-2">
          <MotionButton className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setDialogOpen(true)}>
            <Sparkles size={14} /> Generate article
          </MotionButton>
          <MotionButton className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => refresh()} disabled={isRefreshing} aria-label="Refresh articles">
            <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </MotionButton>
        </div>
      </CardHeader>

      <CardContent noPadding>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : error || !data ? (
          <div style={{ padding: 32 }}>
            <EmptyState title="Couldn't load articles" description={error ?? 'Something went wrong.'} />
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: 40 }}>
            <EmptyState
              icon={<Sparkles size={24} style={{ color: 'var(--admin-accent)' }} />}
              title="No articles yet"
              description="Click Generate article to have the AI research and draft your first one."
              action={
                <button className="admin-btn admin-btn-primary" onClick={() => setDialogOpen(true)}>
                  <Sparkles size={14} /> Generate article
                </button>
              }
            />
          </div>
        ) : (
          <ul className="admin-article-list">
            <AnimatePresence initial={false}>
              {data.map((a, i) => (
                <motion.li
                  key={a.id}
                  layout
                  className="admin-article-row"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, height: 0 }}
                  transition={{ ...softSpring, delay: Math.min(i, 8) * 0.03 }}
                >
                  <div className="admin-article-thumb">
                    {a.hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- served from our own route
                      <img src={`/admin/articles/${a.id}/cover?v=${encodeURIComponent(a.updatedAt)}`} alt="" />
                    ) : (
                      <FileText size={20} />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="admin-flex admin-items-center admin-gap-2" style={{ marginBottom: 4 }}>
                      <StatusBadge status={a.status} />
                      {a.status === 'review' && a.validationErrors.length > 0 && (
                        <span className="admin-badge admin-badge-err">{a.validationErrors.length} to fix</span>
                      )}
                    </div>
                    <div className="admin-article-title">{a.title ?? a.topic ?? 'Choosing a topic…'}</div>
                    {a.status === 'generating' && <Progress step={a.progress} />}
                    {a.status === 'failed' && <div className="admin-text-sm" style={{ color: 'var(--admin-destructive)' }}>{a.error?.split('\n')[0]}</div>}
                    {a.summary && a.status !== 'generating' && <div className="admin-text-sm admin-text-muted admin-article-summary">{a.summary}</div>}
                  </div>
                  <div className="admin-flex admin-items-center admin-gap-2">
                    {a.status !== 'generating' && (
                      <Link href={`/admin/articles/${a.id}`} className={`admin-btn admin-btn-sm ${a.status === 'review' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}>
                        {a.status === 'review' ? 'Review' : 'Open'} <ChevronRight size={14} />
                      </Link>
                    )}
                    <MotionButton className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => remove(a)} aria-label="Delete article">
                      <Trash2 size={14} />
                    </MotionButton>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>

      <GenerateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onStarted={() => {
          void refresh();
        }}
      />
    </Card>
  );
}
