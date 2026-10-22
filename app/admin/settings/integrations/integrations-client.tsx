'use client';
import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Braces, Eye, ImageIcon, KeyRound, Loader2, RotateCcw, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/components/admin/toast';
import { Segmented } from '@/components/admin/segmented';
import { FadeIn, MotionButton } from '@/components/admin/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/card';
import type { SettingDef, SettingSource } from '@/lib/settings';
import { previewBannerPrompts, saveIntegrationSettings, testImageKey } from './actions';

export type SettingRow = SettingDef & { source: SettingSource; value: string; masked: string | null; defaultValue: string | null };

const TEXTAREA =
  'admin-textarea w-full rounded-admin border border-admin-border bg-admin-surface px-3 py-2 text-xs font-mono leading-relaxed text-admin-fg focus:border-admin-accent focus:outline-none';

const PLACEHOLDERS = [
  { token: '{{subject}}', help: "The article's image subject (editable per article)" },
  { token: '{{title}}', help: 'The article headline, as context' },
  { token: '{{direction}}', help: 'One of the three art directions below' },
  { token: '{{palette}}', help: 'A colour palette picked per article' },
];

const SAMPLE = {
  title: 'Sony WH-1000XM6 vs Bose QC Ultra: Which Is Worth It?',
  subject: 'a pair of premium over-ear noise-cancelling headphones with soft cushions and a matte aluminium headband',
};

function SourceBadge({ source }: { source: SettingSource }) {
  const tone = {
    panel: ['Saved here', 'bg-admin-ok-subtle/50 text-admin-ok border-admin-ok-border/60'],
    env: ['From .env', 'bg-admin-muted-bg text-admin-muted border-admin-border'],
    default: ['Default', 'bg-admin-muted-bg text-admin-muted border-admin-border'],
    unset: ['Not set', 'bg-admin-destructive-subtle/50 text-admin-destructive border-admin-destructive-border/60'],
  }[source];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone[1]}`}>{tone[0]}</span>;
}

function Section({ icon, title, description, children, delay }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode; delay: number }) {
  return (
    <FadeIn delay={delay}>
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-admin-accent inline-flex">{icon}</span> {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 p-6">{children}</CardContent>
      </Card>
    </FadeIn>
  );
}

export function IntegrationsClient({ rows }: { rows: SettingRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  /** Only changed keys. A null value means "remove the panel override". */
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<{ concept: string; prompt: string }[] | null>(null);
  const [previewIdx, setPreviewIdx] = useState('0');
  const [previewing, setPreviewing] = useState(false);
  const [sample, setSample] = useState(SAMPLE);
  const textareas = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [lastPrompt, setLastPrompt] = useState('BANNER_PROMPT_TEMPLATE');

  const byGroup = (g: SettingDef['group']) => rows.filter((r) => r.group === g);
  const row = (key: string) => rows.find((r) => r.key === key)!;
  const current = (r: SettingRow) => (r.key in draft ? (draft[r.key] ?? r.defaultValue ?? '') : r.value);
  const dirty = Object.keys(draft).length > 0;

  const setValue = (r: SettingRow, value: string) =>
    setDraft((d) => {
      const next = { ...d };
      if (r.kind !== 'secret' && value === r.value) delete next[r.key];
      else if (r.kind === 'secret' && !value) delete next[r.key];
      else next[r.key] = value;
      return next;
    });

  /** Drops the panel value so .env or the built-in default applies again. */
  const reset = (r: SettingRow) =>
    setDraft((d) => {
      const next = { ...d };
      if (r.source === 'panel') next[r.key] = null;
      else delete next[r.key];
      return next;
    });

  const insertToken = (token: string) => {
    const r = row(lastPrompt);
    const el = textareas.current[lastPrompt];
    const value = current(r);
    const at = el?.selectionStart ?? value.length;
    setValue(r, value.slice(0, at) + token + value.slice(el?.selectionEnd ?? at));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveIntegrationSettings(Object.entries(draft).map(([key, value]) => ({ key, value })));
      if (!res.ok) return toast.error('Not saved', res.error);
      setDraft({});
      toast.success('Saved', 'New settings apply to the next generation, no restart needed.');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testImageKey(draft.IMAGE_API_KEY ?? undefined);
      setTestResult(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
    } finally {
      setTesting(false);
    }
  };

  const runPreview = async () => {
    setPreviewing(true);
    try {
      const overrides = Object.fromEntries(byGroup('prompts').map((r) => [r.key, current(r)]));
      setPreview(await previewBannerPrompts({ ...sample, overrides }));
    } catch (e) {
      toast.error('Preview failed', (e as Error).message);
    } finally {
      setPreviewing(false);
    }
  };

  const selectRow = (r: SettingRow) => {
    const value = current(r);
    const options = r.options ?? [];
    return (
      <select className="admin-select" value={value} onChange={(e) => setValue(r, e.target.value)}>
        {!options.includes(value) && value && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  };

  const label = (r: SettingRow, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-xs font-semibold text-admin-fg flex items-center gap-2">
        {r.label} <SourceBadge source={r.key in draft ? (draft[r.key] === null ? 'env' : 'panel') : r.source} />
      </span>
      <div className="flex items-center gap-1.5">
        {extra}
        {(r.source === 'panel' || r.key in draft) && (
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => reset(r)} title="Remove the value saved here">
            <RotateCcw size={12} /> {r.kind === 'prompt' ? 'Reset to default' : r.kind === 'secret' ? 'Use .env' : 'Reset'}
          </button>
        )}
      </div>
    </div>
  );

  const hint = (text?: string) => (text ? <span className="text-xs text-admin-muted leading-relaxed">{text}</span> : null);

  return (
    <div className="py-7 pb-28 max-w-4xl mx-auto flex flex-col gap-6">
      <FadeIn>
        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-xs text-admin-muted hover:text-admin-fg no-underline mb-3">
          <ArrowLeft size={13} /> Settings
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-admin-fg m-0">AI &amp; API keys</h1>
        <p className="text-sm text-admin-muted mt-1 mb-0 leading-relaxed">
          Change keys, the image model and the banner prompts here instead of editing <code>.env</code>. Anything you leave alone keeps using{' '}
          <code>.env</code>. Changes apply to the next generation without a restart.
        </p>
      </FadeIn>

      <Section icon={<KeyRound size={17} />} title="API keys" description="Keys are encrypted before they're stored and are never shown again in full." delay={0.04}>
        {byGroup('keys').map((r) => (
          <div key={r.key} className="flex flex-col gap-1.5">
            {label(
              r,
              r.key === 'IMAGE_API_KEY' && (
                <MotionButton type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={runTest} disabled={testing}>
                  {testing ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Test key
                </MotionButton>
              ),
            )}
            <input
              className="admin-input font-mono"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={draft[r.key] === null ? 'Will use the .env value after saving' : r.masked ? `Current: ${r.masked}. Paste a new key to replace it` : 'Paste key'}
              value={draft[r.key] ?? ''}
              onChange={(e) => setValue(r, e.target.value)}
            />
            {hint(r.hint)}
            {r.key === 'IMAGE_API_KEY' && (
              <AnimatePresence>
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-admin border px-3 py-2 text-xs leading-relaxed ${
                      testResult.ok ? 'border-admin-ok-border/60 bg-admin-ok-subtle/40 text-admin-ok' : 'border-admin-destructive-border/60 bg-admin-destructive-subtle/40 text-admin-destructive'
                    }`}
                  >
                    {testResult.text}
                    {!testResult.ok && /credit|billing|pay/i.test(testResult.text) && (
                      <>
                        {' '}
                        <a href="https://platform.openai.com/settings/organization/billing" target="_blank" rel="noreferrer" className="underline font-semibold">
                          Open OpenAI billing
                        </a>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            {r.key === 'IMAGE_API_KEY' && hint('The test makes one tiny image, which costs less than $0.01.')}
          </div>
        ))}
      </Section>

      <Section icon={<ImageIcon size={17} />} title="Banner images" description="Which model draws article banners, and how much to spend on each." delay={0.08}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(['IMAGE_MODEL', 'IMAGE_QUALITY'] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              {label(row(k))}
              {selectRow(row(k))}
              {hint(row(k).hint)}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {label(row('ARTICLE_COVER_CANDIDATES'))}
          <div>
            <Segmented
              ariaLabel="Options per generation"
              options={['1', '2', '3'].map((v) => ({ value: v, label: `${v} ${v === '1' ? 'image' : 'images'}` }))}
              value={current(row('ARTICLE_COVER_CANDIDATES')) || '3'}
              onChange={(v) => setValue(row('ARTICLE_COVER_CANDIDATES'), v)}
            />
          </div>
          {hint(row('ARTICLE_COVER_CANDIDATES').hint)}
        </div>
        <div className="flex flex-col gap-1.5">
          {label(row('IMAGE_BASE_URL'))}
          <input className="admin-input font-mono" placeholder="https://api.openai.com/v1 (default)" value={current(row('IMAGE_BASE_URL'))} onChange={(e) => setValue(row('IMAGE_BASE_URL'), e.target.value)} />
          {hint(row('IMAGE_BASE_URL').hint)}
        </div>
      </Section>

      <Section
        icon={<Wand2 size={17} />}
        title="Banner prompt"
        description="What the image model is told. Each generation makes one banner per art direction, all from the same main prompt."
        delay={0.12}
      >
        <div className="flex flex-col gap-2 rounded-admin border border-admin-border bg-admin-muted-bg/40 p-3">
          <span className="text-xs font-semibold text-admin-fg">Placeholders: click to insert at the cursor</span>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS.map((p) => (
              <button key={p.token} type="button" onClick={() => insertToken(p.token)} className="admin-btn admin-btn-outline admin-btn-sm font-mono" title={p.help}>
                {p.token}
              </button>
            ))}
          </div>
          <span className="text-xs text-admin-muted">
            {PLACEHOLDERS.map((p) => `${p.token}: ${p.help.toLowerCase()}`).join(' · ')}
          </span>
        </div>

        {byGroup('prompts').map((r) => (
          <div key={r.key} className="flex flex-col gap-1.5">
            {label(r)}
            <textarea
              ref={(el) => {
                textareas.current[r.key] = el;
              }}
              className={TEXTAREA}
              rows={r.key === 'BANNER_PROMPT_TEMPLATE' ? 18 : 6}
              value={current(r)}
              onFocus={() => setLastPrompt(r.key)}
              onChange={(e) => setValue(r, e.target.value)}
            />
          </div>
        ))}

        <div className="flex flex-col gap-3 rounded-admin border border-admin-border p-4">
          <span className="text-xs font-semibold text-admin-fg flex items-center gap-2">
            <Eye size={14} className="text-admin-accent" /> Preview the final prompt
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="admin-input" value={sample.title} onChange={(e) => setSample((s) => ({ ...s, title: e.target.value }))} aria-label="Sample headline" placeholder="Sample headline" />
            <input className="admin-input" value={sample.subject} onChange={(e) => setSample((s) => ({ ...s, subject: e.target.value }))} aria-label="Sample subject" placeholder="Sample subject" />
          </div>
          <div>
            <MotionButton type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={runPreview} disabled={previewing}>
              {previewing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Build preview (free, uses unsaved edits)
            </MotionButton>
          </div>
          {preview && (
            <>
              <Segmented
                ariaLabel="Art direction"
                options={preview.map((p, i) => ({ value: String(i), label: ['Cinematic hero', 'Bold colour', 'Kinetic energy'][i] ?? p.concept }))}
                value={previewIdx}
                onChange={setPreviewIdx}
              />
              <pre className="m-0 max-h-96 overflow-auto whitespace-pre-wrap rounded-admin bg-admin-muted-bg/60 p-3 text-xs leading-relaxed text-admin-fg">
                {preview[Number(previewIdx)]?.prompt}
              </pre>
            </>
          )}
        </div>
      </Section>

      <Section icon={<Braces size={17} />} title="Advanced: text models" description="The LLM pool that researches, writes and scores articles. Edit with care." delay={0.16}>
        {byGroup('advanced').map((r) => (
          <div key={r.key} className="flex flex-col gap-1.5">
            {label(r)}
            <textarea className={TEXTAREA} rows={14} spellCheck={false} value={current(r)} onChange={(e) => setValue(r, e.target.value)} />
            {hint(r.hint)}
          </div>
        ))}
      </Section>

      <AnimatePresence>
        {dirty && (
          <motion.div
            className="admin-save-bar fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-5 py-3 rounded-admin-lg bg-admin-surface border border-admin-border shadow-admin-xl backdrop-blur-md max-w-lg w-[calc(100%-2rem)]"
            initial={{ y: 80, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <span className="text-xs font-medium text-admin-fg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-admin-warn animate-pulse" />
              {Object.keys(draft).length} unsaved {Object.keys(draft).length === 1 ? 'change' : 'changes'}
            </span>
            <div className="flex items-center gap-2">
              <MotionButton type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setDraft({})} disabled={saving}>
                Discard
              </MotionButton>
              <MotionButton type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </MotionButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
