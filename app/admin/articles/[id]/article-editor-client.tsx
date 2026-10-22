'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ExternalLink, Eye, ImagePlus, Loader2, PencilLine, RefreshCw, Rocket, Save, EyeOff, Settings2, Upload } from 'lucide-react';
import { ArticleBody } from '@/lib/articles/markdown';
import { useToast } from '@/components/admin/toast';
import { StatusBadge } from '@/components/admin/badge';
import { useConfirm } from '@/components/admin/alert-dialog';
import { Segmented } from '@/components/admin/segmented';
import { FadeIn, MotionButton, spring } from '@/components/admin/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/card';
import { apiChooseCover, apiNewCover, apiPublishArticle, apiRegenerateArticle, apiSaveArticle, apiUnpublishArticle, apiUploadCover } from '../../article-actions';

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
  imagePrompt?: string;
  hasImage: boolean;
  /** Generated cover candidates, best AI score first; `chosen` is the one in use. */
  covers: { id: number; score: number | null; notes: string | null; chosen: boolean }[];
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary);
  const [bodyMd, setBodyMd] = useState(article.bodyMd);
  const [faqText, setFaqText] = useState(JSON.stringify(article.faq, null, 2));
  const [alt, setAlt] = useState(article.heroImageAlt);
  const [imagePrompt, setImagePrompt] = useState(article.imagePrompt ?? '');
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
    title !== article.title ||
    summary !== article.summary ||
    bodyMd !== article.bodyMd ||
    faqText !== JSON.stringify(article.faq, null, 2) ||
    alt !== article.heroImageAlt ||
    imagePrompt !== (article.imagePrompt ?? '');
  const live = article.status === 'published';

  const save = async () => {
    if (faqError) return toast.error('Not saved', faqError);
    setBusy('save');
    const res = await apiSaveArticle(article.id, { title, summary, bodyMd, faq, heroImageAlt: alt, imagePrompt });
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
    const res = await apiNewCover(article.id, imagePrompt);
    setBusy(null);
    if (!res.ok) return toast.error('Image failed', res.error);
    setWarnings((w) => [...w.filter((x) => !x.startsWith('Cover is')), ...res.warnings.filter((x) => x.startsWith('Cover is'))]);
    setCoverVersion(String(Date.now()));
    router.refresh(); // loads the new candidates
    const fallback = res.warnings.find((x) => x.startsWith('Cover is a generated graphic'));
    if (fallback) toast.error('AI image generation failed, showing typographic banners', `${fallback}. Check the key under Image settings.`);
    else toast.success('New cover images generated');
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setBusy('upload');
    const res = await apiUploadCover(article.id, formData);
    setBusy(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!res.ok) return toast.error('Upload failed', res.error);
    setCoverVersion(String(Date.now()));
    router.refresh();
    toast.success('Custom banner uploaded');
  };

  const pickCover = async (imageId: number) => {
    setBusy(`cover-${imageId}`);
    const res = await apiChooseCover(article.id, imageId);
    setBusy(null);
    if (!res.ok) return toast.error('Could not change the cover', res.error);
    setCoverVersion(String(Date.now()));
    router.refresh();
    toast.success('Cover updated');
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
      <div className="py-8">
        <nav className="flex items-center gap-2 text-xs text-admin-muted mb-4">
          <Link href="/admin?tab=pages&view=articles" className="hover:text-admin-fg transition-colors">Articles</Link>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-admin-fg mb-4">{article.title || article.topic || 'New article'}</h1>
        {article.status === 'generating' ? (
          <p className="flex items-center gap-2 text-sm text-admin-muted">
            <Loader2 size={16} className="animate-spin text-admin-accent" /> Working on it: {article.progress ?? 'starting'}… this page updates automatically.
          </p>
        ) : (
          <div className="flex flex-col gap-4 max-w-xl">
            <p className="p-4 rounded-admin bg-admin-destructive-subtle/50 border border-admin-destructive-border text-sm text-admin-destructive whitespace-pre-wrap">{article.error}</p>
            <MotionButton className="admin-btn admin-btn-primary w-fit" onClick={rewrite}>
              <RefreshCw size={14} /> Try again
            </MotionButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="py-4 pb-16">
      <nav className="flex items-center gap-2 text-xs text-admin-muted mb-4">
        <Link href="/admin?tab=pages&view=articles" className="hover:text-admin-fg transition-colors">Articles</Link>
        <span className="text-admin-muted/60">/</span>
        <span className="text-admin-fg font-medium">{live ? 'Live' : 'Review'}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-admin-border/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge status={article.status} />
            {errors.length === 0 ? <span className="admin-badge admin-badge-ok">Passed all checks</span> : <span className="admin-badge admin-badge-err">{errors.length} to fix</span>}
          </div>
          <div className="text-xs text-admin-muted">
            Topic: <span className="text-admin-fg font-medium">{article.topic}</span> · Written by {article.generator ?? 'AI'}
            {article.reviewedBy && ` · Published by ${article.reviewedBy}`}
            {live && (
              <>
                {' · '}
                <Link href={`/articles/${article.slug}`} target="_blank" className="text-admin-accent hover:underline inline-flex items-center gap-1">
                  View live <ExternalLink size={11} />
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!live && (
            <MotionButton className="admin-btn admin-btn-ghost admin-btn-sm" onClick={rewrite} disabled={!!busy}>
              <RefreshCw size={14} /> Rewrite
            </MotionButton>
          )}
          {live ? (
            <MotionButton className="admin-btn admin-btn-outline admin-btn-sm text-admin-destructive hover:bg-admin-destructive-subtle/40" onClick={unpublish} disabled={!!busy}>
              <EyeOff size={14} /> Unpublish
            </MotionButton>
          ) : (
            <MotionButton className="admin-btn admin-btn-primary admin-btn-sm" onClick={publish} disabled={!!busy || errors.length > 0 || dirty} title={dirty ? 'Save your changes first' : undefined}>
              {busy === 'publish' ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Publish
            </MotionButton>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(errors.length > 0 || warnings.length > 0) && (
          <motion.ul className="issues flex flex-col gap-1.5 p-3.5 mb-6 rounded-admin bg-admin-destructive-subtle/30 border border-admin-destructive-border/40 text-xs list-none" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring}>
            {errors.map((e) => (
              <li key={e} className="flex items-center gap-2 text-admin-destructive font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-admin-destructive shrink-0" /> {e}
              </li>
            ))}
            {warnings.map((w) => (
              <li key={w} className="flex items-center gap-2 text-admin-warn font-medium">
                <AlertTriangle size={12} className="shrink-0" /> {w}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
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
                  <motion.article key="preview" className="admin-article-preview prose prose-invert max-w-none" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={spring}>
                    <h1 className="text-2xl font-bold tracking-tight text-admin-fg mb-3">{title}</h1>
                    <p className="admin-article-lead text-base text-admin-fg/90 leading-relaxed mb-6 font-normal">{summary}</p>
                    <ArticleBody markdown={bodyMd} sourceCount={article.sources.length} />
                    {faq.length > 0 && !faqError && (
                      <div className="mt-8 border-t border-admin-border/60 pt-6">
                        <h2 className="text-lg font-semibold text-admin-fg mb-4">FAQ</h2>
                        <div className="flex flex-col gap-3">
                          {faq.map((f, i) => (
                            <details key={i} className="rounded-admin border border-admin-border bg-admin-muted-bg/30 p-3.5 transition-colors">
                              <summary className="cursor-pointer font-medium text-sm text-admin-fg hover:text-admin-accent">{f.question}</summary>
                              <p className="mt-2 text-sm text-admin-muted leading-relaxed pl-4 border-l-2 border-admin-accent/40">{f.answer}</p>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.article>
                ) : (
                  <motion.div key="edit" className="flex flex-col gap-4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={spring}>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-admin-muted">Title</label>
                      <input className="w-full rounded-admin border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-fg placeholder:text-admin-muted focus:border-admin-accent focus:outline-none focus:ring-1 focus:ring-admin-accent transition-colors" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-admin-muted">Summary (shown first, used by search engines)</label>
                      <textarea className="w-full rounded-admin border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-fg placeholder:text-admin-muted focus:border-admin-accent focus:outline-none focus:ring-1 focus:ring-admin-accent transition-colors" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-admin-muted">Body</label>
                      <textarea className="w-full rounded-admin border border-admin-border bg-admin-surface px-3 py-2 text-xs font-mono text-admin-fg placeholder:text-admin-muted focus:border-admin-accent focus:outline-none focus:ring-1 focus:ring-admin-accent transition-colors" rows={22} value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} />
                      <span className="text-[11px] text-admin-muted">
                        &quot;## &quot; starts a section, &quot;- &quot; a bullet, **bold**, and [1] cites source 1. Links and HTML aren&apos;t allowed.
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-admin-muted">FAQ (JSON)</label>
                      <textarea className="w-full rounded-admin border border-admin-border bg-admin-surface px-3 py-2 text-xs font-mono text-admin-fg placeholder:text-admin-muted focus:border-admin-accent focus:outline-none focus:ring-1 focus:ring-admin-accent transition-colors" rows={10} value={faqText} onChange={(e) => setFaqText(e.target.value)} />
                      {faqError && <span className="text-xs text-admin-destructive">{faqError}</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </FadeIn>

        <div className="flex flex-col gap-5">
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Cover image</CardTitle>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href="/admin/settings/integrations" className="admin-btn admin-btn-ghost admin-btn-sm no-underline" title="Image model, API key and banner prompt">
                    <Settings2 size={13} /> Image settings
                  </Link>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={onFileSelect}
                  />
                  <MotionButton
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!busy}
                    title="Upload a custom JPG, PNG, WebP or SVG banner"
                  >
                    {busy === 'upload' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload
                  </MotionButton>
                  <MotionButton
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={newCover}
                    disabled={!!busy}
                    title="Generate new candidates based on the prompt"
                  >
                    {busy === 'cover' ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} Regenerate
                  </MotionButton>
                </div>
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
                  <span className="text-admin-muted">No image yet.</span>
                )}
                {article.covers.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-admin-muted">Candidates. Click one to use it:</span>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {article.covers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`relative overflow-hidden rounded-admin-sm border p-0 transition-all cursor-pointer ${
                            c.chosen ? 'border-admin-accent ring-2 ring-admin-accent/50 scale-[1.02] cursor-default' : 'border-admin-border hover:border-admin-accent/60'
                          }`}
                          aria-pressed={c.chosen}
                          disabled={!!busy || c.chosen}
                          onClick={() => pickCover(c.id)}
                          title={c.notes ?? undefined}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only route behind basic auth */}
                          <img src={`/admin/articles/${article.id}/cover?image=${c.id}`} alt={`Cover candidate${c.score != null ? `, AI score ${c.score} of 10` : ''}`} className="aspect-[1200/630] w-full object-cover" loading="lazy" />
                          <span className={`absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            c.chosen ? 'bg-admin-accent text-white' : 'bg-black/75 text-white backdrop-blur-sm'
                          }`}>
                            {busy === `cover-${c.id}` ? '…' : c.chosen ? 'In use' : c.score != null ? `${c.score}/10` : 'Candidate'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-admin-muted">Image prompt / subject (used when regenerating)</label>
                  <input
                    className="w-full rounded-admin border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-fg placeholder:text-admin-muted focus:border-admin-accent focus:outline-none focus:ring-1 focus:ring-admin-accent transition-colors"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="e.g. A desktop gaming monitor with a matte plastic chassis displaying an abstract glowing interface"
                    maxLength={400}
                  />
                  <span className="text-[11px] text-admin-muted">Descriptive visual brief for AI photo generation or editorial vector banner styling.</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-admin-muted">Image description (alt text)</label>
                  <input className="w-full rounded-admin border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-fg placeholder:text-admin-muted focus:border-admin-accent focus:outline-none focus:ring-1 focus:ring-admin-accent transition-colors" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} />
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
                  <span className="text-admin-muted text-admin-sm">No web sources. Verify every claim yourself.</span>
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
            <span className="text-admin-sm">Unsaved changes</span>
            <MotionButton className="admin-btn admin-btn-primary admin-btn-sm" onClick={save} disabled={busy === 'save'}>
              {busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save and re-check
            </MotionButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
