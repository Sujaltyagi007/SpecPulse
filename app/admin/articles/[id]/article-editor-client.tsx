'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ExternalLink, Eye, ImagePlus, Loader2, PencilLine, RefreshCw, Rocket, Save, EyeOff } from 'lucide-react';
import { ArticleBody } from '@/lib/articles/markdown';
import { useToast } from '@/components/admin/toast';
import { StatusBadge } from '@/components/admin/badge';
import { useConfirm } from '@/components/admin/alert-dialog';
import { Segmented } from '@/components/admin/segmented';
import { FadeIn, MotionButton, spring } from '@/components/admin/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/card';
import { apiNewCover, apiPublishArticle, apiRegenerateArticle, apiSaveArticle, apiUnpublishArticle } from '../../article-actions';

interface EditorArticle {
  id: number;
  slug: string;
  topic: string;
  title: string;
  summary: string;
  bodyMd: string;
  faq: { question: string; answer: string }[];
  sources: { title: string; url: string }[];
  heroImageAlt: string;
  hasImage: boolean;
  status: string;
  progress: string | null;
  error: string | null;
  validationErrors: string[];
  warnings: string[];
  generator: string | null;
  reviewedBy: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export function ArticleEditorClient({ article, products }: { article: EditorArticle; products: { id: number; title: string; status: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary);
  const [bodyMd, setBodyMd] = useState(article.bodyMd);
  const [faqText, setFaqText] = useState(JSON.stringify(article.faq, null, 2));
  const [alt, setAlt] = useState(article.heroImageAlt);
  const [errors, setErrors] = useState(article.validationErrors);
  const [warnings, setWarnings] = useState(article.warnings);
  const [busy, setBusy] = useState<string | null>(null);
  const [coverVersion, setCoverVersion] = useState(article.updatedAt);

  // While a rewrite is running, check back until it finishes.
  useEffect(() => {
    if (article.status !== 'generating') return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [article.status, router]);

  let faq: { question: string; answer: string }[] = article.faq;
  let faqError: string | null = null;
  try {
    faq = JSON.parse(faqText);
    if (!Array.isArray(faq)) throw new Error();
  } catch {
    faqError = 'FAQ must be a JSON list of {"question", "answer"}';
  }
  const dirty =
    title !== article.title || summary !== article.summary || bodyMd !== article.bodyMd || faqText !== JSON.stringify(article.faq, null, 2) || alt !== article.heroImageAlt;
  const live = article.status === 'published';

  const save = async () => {
    if (faqError) return toast.error('Not saved', faqError);
    setBusy('save');
    const res = await apiSaveArticle(article.id, { title, summary, bodyMd, faq, heroImageAlt: alt });
    setBusy(null);
    if (!res.ok) return toast.error('Not saved', res.error);
    setErrors(res.errors);
    setWarnings(res.warnings);
    toast.success('Saved', res.errors.length ? `${res.errors.length} thing(s) still to fix before publishing.` : 'Checks pass.');
    router.refresh();
  };

  const publish = async () => {
    const ok = await confirm({
      title: 'Publish this article?',
      description: 'It goes live straight away at /articles. Make sure you have checked its claims against the sources.',
      confirmText: 'Publish',
    });
    if (!ok) return;
    setBusy('publish');
    const res = await apiPublishArticle(article.id);
    setBusy(null);
    if (!res.ok) return toast.error('Not published', res.error);
    toast.success('Published', 'The article is live.');
    router.refresh();
  };

  const unpublish = async () => {
    const ok = await confirm({ title: 'Unpublish article?', description: 'It is removed from the site. You can publish it again later.', confirmText: 'Unpublish', tone: 'destructive' });
    if (!ok) return;
    setBusy('unpublish');
    const res = await apiUnpublishArticle(article.id);
    setBusy(null);
    if (!res.ok) return toast.error('Could not unpublish', res.error);
    toast.info('Unpublished');
    router.refresh();
  };

  const newCover = async () => {
    setBusy('cover');
    const res = await apiNewCover(article.id);
    setBusy(null);
    if (!res.ok) return toast.error('Image failed', res.error);
    setWarnings((w) => [...w.filter((x) => !x.startsWith('Cover is')), ...res.warnings.filter((x) => x.startsWith('Cover is'))]);
    setCoverVersion(String(Date.now()));
    toast.success('New cover image');
  };

  const rewrite = async () => {
    const ok = await confirm({
      title: 'Rewrite from scratch?',
      description: 'The AI researches and writes the article again. Your edits to this draft are replaced.',
      confirmText: 'Rewrite',
      tone: 'destructive',
    });
    if (!ok) return;
    const res = await apiRegenerateArticle(article.id);
    if (!res.ok) return toast.error('Could not rewrite', res.error);
    toast.info('Rewriting', 'This takes a minute or two.');
    router.refresh();
  };

  if (article.status === 'generating' || article.status === 'failed') {
    return (
      <div style={{ padding: '32px 0' }}>
        <nav className="admin-breadcrumb">
          <Link href="/admin?tab=pages&view=articles">Articles</Link>
        </nav>
        <h1 className="admin-page-title">{article.title || article.topic || 'New article'}</h1>
        {article.status === 'generating' ? (
          <p className="admin-text-muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Loader2 size={16} className="animate-spin" /> Working on it: {article.progress ?? 'starting'}… this page updates by itself.
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--admin-destructive)', whiteSpace: 'pre-wrap' }}>{article.error}</p>
            <MotionButton className="admin-btn admin-btn-primary" onClick={rewrite}>
              <RefreshCw size={14} /> Try again
            </MotionButton>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0 48px' }}>
      <nav className="admin-breadcrumb">
        <Link href="/admin?tab=pages&view=articles">Articles</Link>
        <span className="admin-breadcrumb-separator">/</span>
        <span>{live ? 'Live' : 'Review'}</span>
      </nav>

      <div className="admin-page-header">
        <div style={{ minWidth: 0 }}>
          <div className="admin-flex admin-items-center admin-gap-2" style={{ marginBottom: 6 }}>
            <StatusBadge status={article.status} />
            {errors.length === 0 ? <span className="admin-badge admin-badge-ok">Passed all checks</span> : <span className="admin-badge admin-badge-err">{errors.length} to fix</span>}
          </div>
          <div className="admin-text-sm admin-text-muted">
            Topic: {article.topic} · Written by {article.generator ?? 'AI'}
            {article.reviewedBy && ` · Published by ${article.reviewedBy}`}
            {live && (
              <>
                {' · '}
                <Link href={`/articles/${article.slug}`} target="_blank" style={{ color: 'var(--admin-accent)' }}>
                  View live <ExternalLink size={11} />
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="admin-flex admin-items-center admin-gap-2">
          {!live && (
            <MotionButton className="admin-btn admin-btn-ghost" onClick={rewrite} disabled={!!busy}>
              <RefreshCw size={14} /> Rewrite
            </MotionButton>
          )}
          {live ? (
            <MotionButton className="admin-btn admin-btn-outline" style={{ color: 'var(--admin-destructive)' }} onClick={unpublish} disabled={!!busy}>
              <EyeOff size={14} /> Unpublish
            </MotionButton>
          ) : (
            <MotionButton className="admin-btn admin-btn-primary" onClick={publish} disabled={!!busy || errors.length > 0 || dirty} title={dirty ? 'Save your changes first' : undefined}>
              {busy === 'publish' ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Publish
            </MotionButton>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(errors.length > 0 || warnings.length > 0) && (
          <motion.ul className="issues admin-article-issues" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring}>
            {errors.map((e) => (
              <li key={e} style={{ color: 'var(--admin-destructive)' }}>{e}</li>
            ))}
            {warnings.map((w) => (
              <li key={w} style={{ color: 'var(--admin-warn)' }}>
                <AlertTriangle size={12} /> {w}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="admin-article-editor">
        <FadeIn>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Article</CardTitle>
                <CardDescription>Check each claim against its numbered source before publishing.</CardDescription>
              </div>
              <Segmented
                ariaLabel="Preview or edit"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'preview', label: 'Preview', icon: <Eye size={13} /> },
                  { value: 'edit', label: 'Edit', icon: <PencilLine size={13} /> },
                ]}
              />
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'preview' ? (
                  <motion.article key="preview" className="admin-article-preview" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={spring}>
                    <h1>{title}</h1>
                    <p className="admin-article-lead">{summary}</p>
                    <ArticleBody markdown={bodyMd} sourceCount={article.sources.length} />
                    {faq.length > 0 && !faqError && (
                      <>
                        <h2>FAQ</h2>
                        {faq.map((f, i) => (
                          <details key={i}>
                            <summary>{f.question}</summary>
                            <p>{f.answer}</p>
                          </details>
                        ))}
                      </>
                    )}
                  </motion.article>
                ) : (
                  <motion.div key="edit" style={{ display: 'grid', gap: 16 }} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={spring}>
                    <div className="admin-form-group">
                      <label className="admin-label">Title</label>
                      <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Summary (shown first, used by search engines)</label>
                      <textarea className="admin-textarea" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">Body</label>
                      <textarea className="admin-textarea" rows={22} value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8125rem' }} />
                      <span className="admin-form-hint">
                        &quot;## &quot; starts a section, &quot;- &quot; a bullet, **bold**, and [1] cites source 1. Links and HTML aren&apos;t allowed.
                      </span>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">FAQ (JSON)</label>
                      <textarea className="admin-textarea" rows={10} value={faqText} onChange={(e) => setFaqText(e.target.value)} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8125rem' }} />
                      {faqError && <span className="admin-form-hint" style={{ color: 'var(--admin-destructive)' }}>{faqError}</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </FadeIn>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Cover image</CardTitle>
                </div>
                <MotionButton className="admin-btn admin-btn-secondary admin-btn-sm" onClick={newCover} disabled={!!busy}>
                  {busy === 'cover' ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} New image
                </MotionButton>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: 12 }}>
                {article.hasImage || coverVersion !== article.updatedAt ? (
                  <motion.img
                    key={coverVersion}
                    src={`/admin/articles/${article.id}/cover?v=${encodeURIComponent(coverVersion)}`}
                    alt={alt}
                    className="admin-article-cover"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={spring}
                  />
                ) : (
                  <span className="admin-text-muted">No image yet.</span>
                )}
                <div className="admin-form-group">
                  <label className="admin-label">Image description (alt text)</label>
                  <input className="admin-input" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} />
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Sources ({article.sources.length})</CardTitle>
                  <CardDescription>Found by web research. [n] in the text refers to these.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {article.sources.length === 0 ? (
                  <span className="admin-text-muted admin-text-sm">No web sources. Verify every claim yourself.</span>
                ) : (
                  <ol className="admin-article-sources">
                    {article.sources.map((s, i) => (
                      <li key={i} id={`source-${i + 1}`}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.title || s.url}
                        </a>
                        <small>{new URL(s.url).hostname.replace(/^www\./, '')}</small>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {products.length > 0 && (
            <FadeIn delay={0.15}>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Linked products</CardTitle>
                    <CardDescription>Shown under the article. Only live products appear on the site.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {products.map((p) => (
                    <Link key={p.id} href={`/admin/products/${p.id}`} className="admin-badge" style={{ textDecoration: 'none' }}>
                      {p.title} · {p.status}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </div>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            className="admin-save-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <span className="admin-text-sm">Unsaved changes</span>
            <MotionButton className="admin-btn admin-btn-primary admin-btn-sm" onClick={save} disabled={busy === 'save'}>
              {busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save and re-check
            </MotionButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
