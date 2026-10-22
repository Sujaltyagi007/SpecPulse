'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/admin/toast';
import { Avatar } from '@/components/admin/avatar';
import { AnimatePresence, motion } from 'motion/react';
import { Segmented } from '@/components/admin/segmented';
import { useAdmin } from '@/components/admin/theme-root';
import { saveProfile, saveTheme } from '../profile-actions';
import React, { useEffect, useId, useRef, useState } from 'react';
import { FadeIn, MotionButton, spring } from '@/components/admin/motion';
import { ACCENTS, DEFAULT_THEME, PRESETS, type AdminTheme } from '@/lib/admin-theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/card';
import { Camera, ChevronRight, Flame, KeyRound, Monitor, Moon, Palette, Snowflake, Sun, Trash2, UserRound, Circle } from 'lucide-react';

const AVATAR_PX = 160;

async function toAvatarDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file is not an image we can read'));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = AVATAR_PX;
    canvas.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    const webp = canvas.toDataURL('image/webp', 0.85);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sameTheme(a: AdminTheme, b: AdminTheme) {
  return (Object.keys(a) as (keyof AdminTheme)[]).every((k) => a[k] === b[k]);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="admin-field flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-admin-fg">{label}</span>
      {children}
      {hint && <span className="admin-field-hint text-xs text-admin-muted leading-relaxed">{hint}</span>}
    </div>
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <input type="color" className="admin-color-input w-8 h-8 rounded-admin border border-admin-border cursor-pointer bg-transparent p-0.5" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />;
}

export function SettingsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { identity, setIdentity, savedTheme, setSavedTheme, previewTheme } = useAdmin();
  const swatchRing = `swatch-${useId()}`;
  const presetRing = `preset-${useId()}`;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(identity.displayName);
  const [role, setRole] = useState(identity.role ?? '');
  const [avatar, setAvatar] = useState(identity.avatar);
  const [theme, setTheme] = useState<AdminTheme>(savedTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    previewTheme(theme);
  }, [theme, previewTheme]);
  useEffect(() => () => previewTheme(null), [previewTheme]);

  const profileDirty = name !== identity.displayName || role !== (identity.role ?? '') || avatar !== identity.avatar;
  const themeDirty = !sameTheme(theme, savedTheme);
  const dirty = profileDirty || themeDirty;
  const set = <K extends keyof AdminTheme>(key: K, value: AdminTheme[K]) => setTheme((t) => ({ ...t, [key]: value }));

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAvatar(await toAvatarDataUrl(file));
    } catch (e) {
      toast.error('Could not use that image', (e as Error).message);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (profileDirty) {
        const res = await saveProfile({ displayName: name, role, avatar });
        if (!res.ok) return toast.error('Profile not saved', res.error);
        setIdentity({ ...identity, displayName: name.trim(), role: role.trim() || null, avatar });
      }
      if (themeDirty) {
        const res = await saveTheme(theme);
        if (!res.ok) return toast.error('Appearance not saved', res.error);
        setSavedTheme(theme);
      }
      toast.success('Saved', 'Your profile and appearance are updated.');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setName(identity.displayName);
    setRole(identity.role ?? '');
    setAvatar(identity.avatar);
    setTheme(savedTheme);
  };

  const customButton = theme.button !== 'neutral' && theme.button !== 'accent';
  const customAccent = !ACCENTS.some((a) => a.value === theme.accent);

  return (
    <div className="py-7 pb-12 max-w-5xl mx-auto flex flex-col gap-6">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight text-admin-fg m-0">Settings</h1>
        <p className="text-sm text-admin-muted mt-1 mb-5">
          Your profile and how the dashboard looks for you. Other admins keep their own settings.
        </p>
        <Link
          href="/admin/settings/integrations"
          className="flex items-center gap-3 rounded-admin-lg border border-admin-border bg-admin-surface px-4 py-3 no-underline text-admin-fg hover:border-admin-accent transition-colors"
        >
          <span className="inline-flex rounded-admin bg-admin-muted-bg p-2 text-admin-accent">
            <KeyRound size={16} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">AI &amp; API keys</span>
            <span className="block text-xs text-admin-muted">API keys, image model and banner prompts, shared by all admins</span>
          </span>
          <ChevronRight size={16} className="text-admin-muted" />
        </Link>
      </FadeIn>

      <div className="admin-settings-grid grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <FadeIn delay={0.05}>
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserRound size={17} className="text-admin-accent" /> Profile
                </CardTitle>
                <CardDescription>Shown in the header and on approvals you make.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4.5 p-6">
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{ position: 'relative', border: 0, padding: 0, background: 'none', cursor: 'pointer', borderRadius: 9999 }}
                  whileHover="hover"
                  whileTap={{ scale: 0.94 }}
                  aria-label="Change avatar"
                >
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={avatar ?? 'initials'}
                      style={{ display: 'inline-flex' }}
                      initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    >
                      <Avatar name={name || identity.username} src={avatar} size={72} />
                    </motion.span>
                  </AnimatePresence>
                  <motion.span
                    variants={{ hover: { opacity: 1 } }}
                    initial={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 9999,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(0,0,0,0.45)',
                      color: '#fff',
                    }}
                  >
                    <Camera size={20} />
                  </motion.span>
                </motion.button>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <MotionButton type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => fileRef.current?.click()}>
                    <Camera size={13} /> Upload photo
                  </MotionButton>
                  {avatar && (
                    <MotionButton type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAvatar(null)}>
                      <Trash2 size={13} /> Remove
                    </MotionButton>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(e) => {
                    void pickAvatar(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
              <Field label="Display name">
                <input className="admin-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Role" hint="Optional, e.g. Editor or Product lead">
                <input className="admin-input" value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} />
              </Field>
              <Field label="Login">
                <span className="text-admin-sm text-admin-muted">@{identity.username}</span>
              </Field>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <div id="appearance" />
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette size={17} className="text-admin-accent" /> Appearance
                </CardTitle>
                <CardDescription>Changes preview live. Save to keep them.</CardDescription>
              </div>
              <MotionButton type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setTheme(DEFAULT_THEME)}>
                Reset
              </MotionButton>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 p-6">
              <Field label="Quick looks">
                <div className="admin-option-row">
                  {PRESETS.map((p) => {
                    const look = { ...theme, ...p.theme };
                    const active = sameTheme(look, theme);
                    const buttonColor = look.button === 'accent' ? look.accent : look.button === 'neutral' ? 'var(--admin-fg)' : look.button;
                    return (
                      <motion.button
                        key={p.name}
                        type="button"
                        className="admin-preset"
                        onClick={() => setTheme(look)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={spring}
                      >
                        {active && <motion.span layoutId={presetRing} className="admin-preset-ring" transition={spring} />}
                        <span className="admin-preset-chips">
                          <span style={{ background: look.temperature === 'warm' ? '#f4efe8' : look.temperature === 'neutral' ? '#f4f4f5' : '#f1f5f9' }} />
                          <span style={{ background: look.accent }} />
                          <span style={{ background: buttonColor }} />
                        </span>
                        {p.name}
                      </motion.button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Temperature" hint="Cool slate, warm stone, or plain gray for backgrounds and text.">
                <Segmented
                  ariaLabel="Temperature"
                  value={theme.temperature}
                  onChange={(v) => set('temperature', v)}
                  options={[
                    { value: 'cool', label: 'Cool', icon: <Snowflake size={13} /> },
                    { value: 'warm', label: 'Warm', icon: <Flame size={13} /> },
                    { value: 'neutral', label: 'Neutral', icon: <Circle size={13} /> },
                  ]}
                />
              </Field>

              <Field label="Accent color" hint="Links, highlights and the active tab.">
                <div className="admin-option-row">
                  {ACCENTS.map((a) => (
                    <motion.button
                      key={a.value}
                      type="button"
                      className="admin-swatch"
                      style={{ background: a.value }}
                      title={a.name}
                      aria-label={a.name}
                      aria-pressed={theme.accent === a.value}
                      onClick={() => set('accent', a.value)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      transition={spring}
                    >
                      {theme.accent === a.value && <motion.span layoutId={swatchRing} className="admin-swatch-ring" transition={spring} />}
                    </motion.button>
                  ))}
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <ColorInput label="Custom accent" value={theme.accent} onChange={(v) => set('accent', v)} />
                    {customAccent && <motion.span layoutId={swatchRing} className="admin-swatch-ring" style={{ inset: -5, borderRadius: 10 }} transition={spring} />}
                  </span>
                </div>
              </Field>

              <Field label="Buttons">
                <div className="admin-option-row">
                  <Segmented
                    ariaLabel="Button color"
                    value={customButton ? 'custom' : (theme.button as 'neutral' | 'accent')}
                    onChange={(v) => set('button', v === 'custom' ? (customButton ? theme.button : '#0f766e') : v)}
                    options={[
                      { value: 'neutral', label: 'Neutral' },
                      { value: 'accent', label: 'Accent' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                  />
                  <AnimatePresence>
                    {customButton && (
                      <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={spring}>
                        <ColorInput label="Custom button color" value={theme.button} onChange={(v) => set('button', v)} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Field>

              <Field label="Borders">
                <div className="admin-option-row">
                  <Segmented
                    ariaLabel="Border color"
                    value={theme.border === 'default' ? 'default' : 'custom'}
                    onChange={(v) => set('border', v === 'default' ? 'default' : theme.border === 'default' ? '#cbd5e1' : theme.border)}
                    options={[
                      { value: 'default', label: 'Default' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                  />
                  <AnimatePresence>
                    {theme.border !== 'default' && (
                      <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={spring}>
                        <ColorInput label="Custom border color" value={theme.border} onChange={(v) => set('border', v)} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Mode">
                  <Segmented
                    ariaLabel="Color mode"
                    value={theme.mode}
                    onChange={(v) => set('mode', v)}
                    options={[
                      { value: 'system', label: 'Auto', icon: <Monitor size={13} /> },
                      { value: 'light', label: 'Light', icon: <Sun size={13} /> },
                      { value: 'dark', label: 'Dark', icon: <Moon size={13} /> },
                    ]}
                  />
                </Field>
                <Field label="Corners">
                  <Segmented
                    ariaLabel="Corner radius"
                    value={theme.radius}
                    onChange={(v) => set('radius', v)}
                    options={[
                      { value: 'sharp', label: 'Sharp' },
                      { value: 'default', label: 'Soft' },
                      { value: 'round', label: 'Round' },
                    ]}
                  />
                </Field>
                <Field label="Density" hint="Compact fits more rows on screen.">
                  <Segmented
                    ariaLabel="Density"
                    value={theme.density}
                    onChange={(v) => set('density', v)}
                    options={[
                      { value: 'comfortable', label: 'Comfortable' },
                      { value: 'compact', label: 'Compact' },
                    ]}
                  />
                </Field>
                <Field label="Animations" hint="Reduced keeps fades but drops movement.">
                  <Segmented
                    ariaLabel="Animations"
                    value={theme.motion}
                    onChange={(v) => set('motion', v)}
                    options={[
                      { value: 'full', label: 'Full' },
                      { value: 'reduced', label: 'Reduced' },
                    ]}
                  />
                </Field>
              </div>

              <Field label="Preview">
                <div className="admin-preview p-4 rounded-admin border border-admin-border bg-admin-muted-bg/30 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <MotionButton type="button" className="admin-btn admin-btn-primary admin-btn-sm">Primary</MotionButton>
                    <MotionButton type="button" className="admin-btn admin-btn-secondary admin-btn-sm">Secondary</MotionButton>
                    <span className="admin-badge admin-badge-ok inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-admin-ok-subtle text-admin-ok border border-admin-ok-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-admin-ok" />
                      Live
                    </span>
                    <span className="admin-badge admin-badge-warn inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-admin-warn-subtle text-admin-warn border border-admin-warn-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-admin-warn" />
                      In review
                    </span>
                    <a className="text-admin-accent text-xs cursor-pointer hover:underline">A link</a>
                  </div>
                  <input className="admin-input w-full" placeholder="Input field preview" readOnly />
                </div>
              </Field>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

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
              Unsaved changes{themeDirty && ' (previewing)'}
            </span>
            <div className="flex items-center gap-2">
              <MotionButton type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={discard} disabled={saving}>
                Discard
              </MotionButton>
              <MotionButton type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={save} disabled={saving || !name.trim()}>
                {saving ? 'Saving…' : 'Save changes'}
              </MotionButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
