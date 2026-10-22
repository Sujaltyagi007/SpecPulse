'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, FileText, Loader2, RotateCw, Sparkles, Trash2, Wand2, Compass, Globe, PenTool, Image as ImageIcon, ShieldCheck, Flame, RefreshCw, TrendingUp } from 'lucide-react';
import { useTabData } from '@/lib/admin-cache';
import { useToast } from '@/components/admin/toast';
import { StatusBadge } from '@/components/admin/badge';
import { EmptyState } from '@/components/admin/empty-state';
import { useConfirm } from '@/components/admin/alert-dialog';
import { TableSkeleton } from '@/components/admin/skeleton';
import { MotionButton, softSpring, spring } from '@/components/admin/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/card';
import { apiDeleteArticle, apiGetTrendingTopics, apiStartArticle, getArticlesData, type ArticleListItem, type TrendingTopicItem } from '../article-actions';

const STEPS = [
  { key: 'topic', label: 'Topic Strategy', icon: <Compass size={11} /> },
  { key: 'research', label: 'Web Research', icon: <Globe size={11} /> },
  { key: 'writing', label: 'Drafting Copy', icon: <PenTool size={11} /> },
  { key: 'humanize', label: 'Line Edit', icon: <Wand2 size={11} /> },
  { key: 'image', label: 'Cover Picks', icon: <ImageIcon size={11} /> },
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
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [trends, setTrends] = useState<TrendingTopicItem[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const loadTrends = async () => {
    setLoadingTrends(true);
    const res = await apiGetTrendingTopics();
    setLoadingTrends(false);
    if (!res.ok) {
      toast.error('Could not fetch trending topics', res.error);
      return;
    }
    setTrends(res.topics);
  };

  const handleToggleSuggest = () => {
    const next = !suggestOpen;
    setSuggestOpen(next);
    if (next && trends.length === 0) {
      loadTrends();
    }
  };

  const start = async () => {
    setBusy(true);
    const res = await apiStartArticle(topic);
    setBusy(false);
    if (!res.ok) return toast.error('Could not start', res.error);
    toast.success('Generating article', topic ? `Researching "${topic}"…` : 'Picking a topic from your catalog…');
    setTopic('');
    setSuggestOpen(false);
    onStarted(res.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="admin-dialog-backdrop" onClick={() => !busy && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="admin-dialog-panel"
            style={{ maxWidth: 580 }}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="admin-label" htmlFor="article-topic" style={{ margin: 0 }}>
                  Topic (optional)
                </label>
                <button
                  type="button"
                  onClick={handleToggleSuggest}
                  disabled={busy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    color: suggestOpen ? 'var(--admin-primary-fg)' : 'var(--admin-accent)',
                    backgroundColor: suggestOpen ? 'var(--admin-primary)' : 'color-mix(in srgb, var(--admin-accent) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Browse trending tech queries and topic suggestions"
                >
                  <Flame size={12} style={{ color: suggestOpen ? 'currentColor' : '#f97316' }} />
                  {suggestOpen ? 'Hide Trending Topics' : 'Suggest Trending Topics'}
                </button>
              </div>

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
              <span className="admin-form-hint">
                {topic ? 'Topic selected. You can tweak it above or click Generate.' : 'Choose a trending topic below, enter your own, or leave blank to let AI auto-select.'}
              </span>
            </div>

            {/* Trending topics suggestion list */}
            <AnimatePresence>
              {suggestOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', marginBottom: 16 }}
                >
                  <div
                    style={{
                      background: 'var(--admin-muted-bg)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: 'var(--admin-radius)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--admin-border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-fg)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <TrendingUp size={13} style={{ color: 'var(--admin-accent)' }} />
                        Trending Tech Topics
                        <span style={{ fontSize: '0.6875rem', color: 'var(--admin-muted)', fontWeight: 400 }}>
                          (Live Google Trends & Catalog Picks)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={loadTrends}
                        disabled={loadingTrends || busy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.6875rem',
                          color: 'var(--admin-muted)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                        title="Reload live Google Trends"
                      >
                        <RefreshCw size={11} className={loadingTrends ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                    </div>

                    {loadingTrends ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
                        <div className="admin-skeleton" style={{ height: 48, width: '100%', borderRadius: 6 }} />
                        <div className="admin-skeleton" style={{ height: 48, width: '100%', borderRadius: 6 }} />
                        <div className="admin-skeleton" style={{ height: 48, width: '100%', borderRadius: 6 }} />
                      </div>
                    ) : trends.length === 0 ? (
                      <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--admin-muted)' }}>
                        No trending topics found. Click Refresh to try again.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          maxHeight: 250,
                          overflowY: 'auto',
                          paddingRight: 4,
                        }}
                      >
                        {trends.map((item) => {
                          const isSelected = topic === item.topic;
                          return (
                            <div
                              key={item.id}
                              onClick={() => setTopic(item.topic)}
                              style={{
                                padding: '9px 12px',
                                borderRadius: 'var(--admin-radius-sm)',
                                background: isSelected ? 'var(--admin-surface)' : 'color-mix(in srgb, var(--admin-surface) 60%, transparent)',
                                border: `1px solid ${isSelected ? 'var(--admin-accent)' : 'var(--admin-border-subtle)'}`,
                                boxShadow: isSelected ? '0 0 0 1px var(--admin-accent)' : 'var(--admin-shadow-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--admin-fg)', lineHeight: 1.35 }}>
                                  {item.topic}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    padding: '1px 8px',
                                    borderRadius: 9999,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    backgroundColor: isSelected ? 'var(--admin-accent)' : 'var(--admin-border)',
                                    color: isSelected ? 'var(--admin-accent-fg)' : 'var(--admin-muted)',
                                  }}
                                >
                                  {isSelected ? '✓ Selected' : item.badge}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--admin-muted)' }}>
                                  Search keyword: <b>{item.query}</b>
                                </span>
                                {item.breakdown && item.breakdown.length > 0 && (
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {item.breakdown.slice(0, 3).map((b, i) => (
                                      <span
                                        key={i}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTopic(`${item.topic} (focus: ${b})`);
                                        }}
                                        style={{
                                          fontSize: '0.65rem',
                                          padding: '1px 5px',
                                          borderRadius: 3,
                                          background: 'var(--admin-border)',
                                          color: 'var(--admin-muted)',
                                        }}
                                        title="Click to refine topic with this keyword"
                                      >
                                        #{b}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} className="text-admin-accent" />
            Articles
          </CardTitle>
          <CardDescription>AI researches and drafts with sources and a cover image. You review, edit and publish.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="p-6">
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : error || !data ? (
          <div className="p-8">
            <EmptyState title="Couldn't load articles" description={error ?? 'Something went wrong.'} />
          </div>
        ) : data.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<Sparkles size={24} className="text-admin-accent" />}
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
          <ul className="admin-article-list divide-y divide-admin-border/60 list-none m-0 p-0">
            <AnimatePresence initial={false}>
              {data.map((a, i) => (
                <motion.li
                  key={a.id}
                  layout
                  className="admin-article-row flex items-center gap-4 p-4 transition-colors hover:bg-admin-muted-bg/40"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, height: 0 }}
                  transition={{ ...softSpring, delay: Math.min(i, 8) * 0.03 }}
                >
                  <div className="admin-article-thumb flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-admin-sm bg-admin-muted-bg border border-admin-border text-admin-muted">
                    {a.hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- served from our own route
                      <img src={`/admin/articles/${a.id}/cover?v=${encodeURIComponent(a.updatedAt)}`} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileText size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={a.status} />
                      {a.status === 'review' && a.validationErrors.length > 0 && (
                        <span className="admin-badge admin-badge-err">{a.validationErrors.length} to fix</span>
                      )}
                    </div>
                    <div className="admin-article-title font-semibold text-sm text-admin-fg leading-tight">{a.title ?? a.topic ?? 'Choosing a topic…'}</div>
                    {a.status === 'generating' && <Progress step={a.progress} />}
                    {a.status === 'failed' && <div className="text-xs text-admin-destructive mt-1">{a.error?.split('\n')[0]}</div>}
                    {a.summary && a.status !== 'generating' && <div className="text-xs text-admin-muted line-clamp-1 mt-1">{a.summary}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status !== 'generating' && (
                      <Link href={`/admin/articles/${a.id}`} className={`admin-btn admin-btn-sm ${a.status === 'review' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}>
                        {a.status === 'review' ? 'Review' : 'Open'} <ChevronRight size={14} />
                      </Link>
                    )}
                    <MotionButton className="admin-btn admin-btn-ghost admin-btn-sm text-admin-muted hover:text-admin-destructive" onClick={() => remove(a)} aria-label="Delete article">
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
