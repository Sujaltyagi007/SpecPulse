'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { OverviewTab } from './overview-tab';
import { Avatar } from '@/components/admin/avatar';
import { useToast } from '@/components/admin/toast';
import { AnimatePresence, motion } from 'motion/react';
import { useAdmin } from '@/components/admin/theme-root';
import { EmptyState } from '@/components/admin/empty-state';
import { StatsSkeleton } from '@/components/admin/skeleton';
import { useConfirm } from '@/components/admin/alert-dialog';
import { markTabDirty, useTabData } from '@/lib/admin-cache';
import { apiApproveProduct, getHomeData, type HomeData } from '../data-actions';
import { AnimatedNumber, MotionButton, softSpring, spring, Stagger, StaggerItem } from '@/components/admin/motion';
import {
  ArrowRight, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, CircleCheck, FilePlus2, FileText, Globe, Info,
  PartyPopper, PenLine, Plus, RotateCw, ShieldCheck, Sparkles, Tag, Wrench,
} from 'lucide-react';

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

const PAGE_TYPE_LABEL: Record<string, string> = { product: 'Product page', comparison: 'Comparison', roundup: 'Best-of list' };

/** One sentence telling the editor what to do next, with a button that does it. */
function NextStep({ data }: { data: HomeData }) {
  let tone: 'action' | 'ok' = 'action';
  let icon = <Sparkles size={20} />;
  let title: string;
  let text: string;
  let cta: { href: string; label: string } | null = null;

  if (data.readyCount > 0) {
    title = `${plural(data.readyCount, 'product')} ${data.readyCount === 1 ? 'is' : 'are'} waiting for your OK`;
    text = 'All facts are checked. Approve them below and they go live in the next daily publishing run.';
    cta = { href: '#ready', label: 'Review now' };
  } else if (data.copyCount > 0) {
    icon = <PenLine size={20} />;
    title = `${plural(data.copyCount, 'page')} of AI-written text ${data.copyCount === 1 ? 'needs' : 'need'} a quick read`;
    text = 'Read each one against the facts shown beside it, fix anything that sounds off, then approve.';
    cta = { href: `/admin/content/${data.copyToReview[0]!.id}`, label: 'Start reading' };
  } else if (data.needsWorkCount > 0) {
    icon = <Wrench size={20} />;
    title = `${plural(data.needsWorkCount, 'product')} ${data.needsWorkCount === 1 ? 'is' : 'are'} missing some details`;
    text = 'Open a product to see exactly what is missing, such as a spec to tick as verified or a price.';
    cta = { href: data.needsWork[0] ? `/admin/products/${data.needsWork[0].id}` : '/admin?tab=products', label: 'Fix the first one' };
  } else {
    tone = 'ok';
    icon = <PartyPopper size={20} />;
    title = "You're all caught up";
    text = 'Nothing needs you right now. Add a new product or write a guide to grow the site.';
  }

  return (
    <motion.div
      className={`admin-next-step is-${tone} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-admin-lg border shadow-admin-sm transition-all mb-6 ${
        tone === 'ok'
          ? 'bg-admin-ok-subtle/40 border-admin-ok-border text-admin-fg'
          : 'bg-admin-surface border-admin-border text-admin-fg'
      }`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
    >
      <div className="flex items-start gap-3.5">
        <span className={`admin-next-step-icon p-2.5 rounded-admin shrink-0 ${
          tone === 'ok' ? 'bg-admin-ok text-admin-primary-fg' : 'bg-admin-accent/10 text-admin-accent'
        }`}>
          {icon}
        </span>
        <div className="admin-next-step-body">
          <div className="admin-next-step-title font-bold text-base text-admin-fg">{title}</div>
          <p className="text-sm text-admin-muted mt-1 mb-0 leading-relaxed">{text}</p>
        </div>
      </div>
      <div className="admin-next-step-actions flex items-center gap-2 shrink-0">
        {cta ? (
          <Link href={cta.href} className="admin-btn admin-btn-primary">
            {cta.label} <ArrowRight size={15} />
          </Link>
        ) : (
          <>
            <Link href="/admin/products/new" className="admin-btn admin-btn-primary">
              <Plus size={15} /> Add a product
            </Link>
            <Link href="/admin?tab=pages&view=articles" className="admin-btn admin-btn-secondary">
              <FilePlus2 size={15} /> Write a guide
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
}

/** The four stages every product goes through, left to right. */
function Pipeline({ data }: { data: HomeData }) {
  const scheduled = data.scheduled.products + data.scheduled.comparisons + data.scheduled.roundups;
  const live = data.live.products + data.live.comparisons + data.live.roundups;
  const steps = [
    { icon: <Wrench size={16} />, label: 'Being prepared', count: data.needsWorkCount, hint: 'Drafts still missing details', href: '/admin?tab=products' },
    { icon: <ShieldCheck size={16} />, label: 'Waiting for you', count: data.readyCount, hint: 'Checked and ready to approve', href: '#ready', highlight: data.readyCount > 0 },
    { icon: <CalendarClock size={16} />, label: 'Scheduled', count: scheduled, hint: `Up to ${data.dailyLimit} go live each day`, href: '/admin?tab=products' },
    { icon: <Globe size={16} />, label: 'Live on site', count: live, hint: 'Pages visitors can see', href: '/' },
  ];
  return (
    <section className="admin-pipeline-wrap mb-8" aria-labelledby="pipeline-title">
      <div className="admin-section-title mb-3">
        <h2 id="pipeline-title" className="text-base font-bold text-admin-fg m-0">How your content is moving</h2>
        <span className="text-xs text-admin-muted">Every product goes through these four steps</span>
      </div>
      <ol className="admin-pipeline grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 list-none p-0 m-0">
        {steps.map((s, i) => (
          <li key={s.label} className={`relative flex items-center ${s.highlight ? 'is-highlight' : ''}`}>
            <Link
              href={s.href}
              className={`admin-pipeline-step w-full flex flex-col gap-1 p-4 rounded-admin-lg border bg-admin-surface shadow-admin-sm transition-all hover:border-admin-ring group ${
                s.highlight ? 'border-admin-accent ring-1 ring-admin-accent/20' : 'border-admin-border'
              }`}
            >
              <span className="admin-pipeline-top flex items-center justify-between text-xs text-admin-muted mb-1">
                <span className={`admin-pipeline-icon p-1.5 rounded-admin ${s.highlight ? 'text-admin-accent bg-admin-accent/10' : 'text-admin-muted bg-admin-muted-bg'}`}>
                  {s.icon}
                </span>
                <span className="admin-pipeline-num font-mono text-[0.6875rem] uppercase tracking-wider">Step {i + 1}</span>
              </span>
              <AnimatedNumber value={s.count} className="admin-pipeline-count text-2xl font-bold tracking-tight text-admin-fg" />
              <span className="admin-pipeline-label text-sm font-semibold text-admin-fg">{s.label}</span>
              <span className="admin-pipeline-hint text-xs text-admin-muted">{s.hint}</span>
            </Link>
            {i < steps.length - 1 && (
              <ChevronRight size={16} className="admin-pipeline-arrow hidden lg:block absolute -right-2 z-10 text-admin-muted pointer-events-none" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function TaskCard({
  id,
  icon,
  title,
  count,
  hint,
  empty,
  children,
  footer,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  hint: string;
  empty: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <StaggerItem className="admin-task-card bg-admin-surface border border-admin-border rounded-admin-lg p-5 shadow-admin-sm flex flex-col gap-4" lift>
      <div id={id} className="admin-task-head flex items-start gap-3">
        <span className="admin-task-icon p-2 rounded-admin bg-admin-muted-bg text-admin-fg shrink-0">{icon}</span>
        <div className="admin-task-titles flex-1 min-w-0">
          <div className="admin-task-title flex items-center justify-between gap-2 font-bold text-sm text-admin-fg">
            <span>{title}</span>
            <span className={`admin-task-pill inline-flex items-center justify-center text-[0.6875rem] font-bold px-2 py-0.5 rounded-full ${
              count > 0 ? 'has-items bg-admin-accent text-admin-accent-fg' : 'bg-admin-muted-bg text-admin-muted'
            }`}>
              {count}
            </span>
          </div>
          <div className="admin-task-hint text-xs text-admin-muted mt-0.5 leading-snug">{hint}</div>
        </div>
      </div>
      {count === 0 ? (
        <div className="admin-task-empty flex items-center gap-2 p-4 rounded-admin bg-admin-muted-bg/40 text-xs text-admin-muted">
          <CircleCheck size={16} className="text-admin-ok shrink-0" /> {empty}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">{children}</div>
      )}
      {footer}
    </StaggerItem>
  );
}

export function HomeTab() {
  const { identity } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [showSystem, setShowSystem] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const { data, isLoading, isRefreshing, error, refresh, updateData } = useTabData('admin-home', getHomeData, { ttlMs: 60_000 });

  const approve = async (p: { id: number; title: string }) => {
    const ok = await confirm({
      title: `Approve ${p.title}?`,
      description: 'Its facts pass every check. It will go live in the next daily publishing run.',
      confirmText: 'Approve',
    });
    if (!ok) return;
    setApproving(p.id);
    const res = await apiApproveProduct(p.id);
    setApproving(null);
    if (!res.ok) return toast.error('Could not approve', res.error);
    toast.success('Approved', `${p.title} is scheduled to go live.`);
    updateData((prev) =>
      prev
        ? {
            ...prev,
            readyToApprove: prev.readyToApprove.filter((r) => r.id !== p.id),
            readyCount: prev.readyCount - 1,
            scheduled: { ...prev.scheduled, products: prev.scheduled.products + 1 },
          }
        : prev!,
    );
    markTabDirty('admin-overview');
  };

  const firstName = identity.displayName.split(' ')[0];
  const header = (
    <motion.div
      className="admin-greeting flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-2"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={identity.displayName} src={identity.avatar} size={48} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-admin-fg m-0">
            {greeting()}, {firstName}
          </h1>
          <p className="admin-greeting-sub text-sm text-admin-muted m-0 mt-0.5">Here&apos;s what needs you today.</p>
        </div>
      </div>
      <MotionButton className="admin-btn admin-btn-secondary admin-btn-sm admin-refresh-btn self-start sm:self-auto" onClick={() => refresh()} disabled={isRefreshing} title="Refresh" aria-label="Refresh">
        <motion.span style={{ display: 'inline-flex' }} animate={{ rotate: isRefreshing ? 360 : 0 }} transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : spring}>
          <RotateCw size={14} />
        </motion.span>
        <span className="admin-refresh-label">Refresh</span>
      </MotionButton>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <StatsSkeleton />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <EmptyState title="Couldn't load your dashboard" description={error ?? 'Something went wrong. Try Refresh.'} />
      </div>
    );
  }

  const priceStatus = data.lastRun?.error ? 'err' : data.lastRun?.running ? 'warn' : data.lastRun ? 'ok' : 'idle';
  const aiTotal = data.ai.ok + data.ai.failed;

  return (
    <div className="admin-home flex flex-col gap-6">
      {header}
      <NextStep data={data} />
      <Pipeline data={data} />

      <div className="admin-section-title">
        <h2 className="text-base font-bold text-admin-fg m-0">Your to-do list</h2>
      </div>
      <Stagger className="admin-home-grid grid grid-cols-1 lg:grid-cols-3 gap-5">
        <TaskCard
          id="ready"
          icon={<ShieldCheck size={18} />}
          title="Approve products"
          count={data.readyCount}
          hint="All facts are checked. Give your OK to publish."
          empty="Nothing to approve right now."
        >
          <ul className="admin-task-list list-none p-0 m-0 divide-y divide-admin-border-subtle">
            <AnimatePresence initial={false}>
              {data.readyToApprove.map((p) => (
                <motion.li key={p.id} layout exit={{ opacity: 0, x: 40, height: 0 }} transition={spring}>
                  <div className="admin-task-row flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/admin/products/${p.id}`} className="admin-task-row-main flex flex-col min-w-0 font-medium text-sm text-admin-fg hover:text-admin-accent transition-colors">
                      <span className="truncate">{p.title}</span>
                      <small className="text-xs text-admin-muted font-normal">{p.category}</small>
                    </Link>
                    <MotionButton className="admin-btn admin-btn-primary admin-btn-sm shrink-0" disabled={approving === p.id} onClick={() => approve(p)}>
                      <CheckCircle2 size={14} /> Approve
                    </MotionButton>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </TaskCard>

        <TaskCard
          icon={<FileText size={18} />}
          title="Read AI-written text"
          count={data.copyCount}
          hint="Check the page text the AI wrote before it goes live."
          empty="No text waiting to be read."
        >
          <ul className="admin-task-list list-none p-0 m-0 divide-y divide-admin-border-subtle">
            {data.copyToReview.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/content/${c.id}`} className="admin-task-row flex items-center justify-between gap-3 py-2.5 group">
                  <span className="admin-task-row-main flex flex-col min-w-0 font-medium text-sm text-admin-fg group-hover:text-admin-accent transition-colors">
                    <span className="truncate">{c.pageKey}</span>
                    <small className="text-xs text-admin-muted font-normal">{PAGE_TYPE_LABEL[c.pageType]}</small>
                  </span>
                  <ChevronRight size={16} className="admin-task-chevron text-admin-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </li>
            ))}
          </ul>
        </TaskCard>

        <TaskCard
          icon={<Wrench size={18} />}
          title="Finish products"
          count={data.needsWorkCount}
          hint="Drafts missing a verified spec, a barcode (GTIN) or a price."
          empty="No unfinished products."
          footer={
            data.needsWorkCount > data.needsWork.length && (
              <Link href="/admin?tab=products" className="admin-task-more inline-flex items-center gap-1.5 text-xs font-semibold text-admin-accent pt-2 border-t border-admin-border-subtle hover:underline">
                See all {data.needsWorkCount} <ArrowRight size={14} />
              </Link>
            )
          }
        >
          <ul className="admin-task-list list-none p-0 m-0 divide-y divide-admin-border-subtle">
            {data.needsWork.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="admin-task-row flex items-center justify-between gap-3 py-2.5 group">
                  <span className="admin-task-row-main flex flex-col min-w-0 font-medium text-sm text-admin-fg group-hover:text-admin-accent transition-colors">
                    <span className="truncate">{p.title}</span>
                    <small className="text-xs text-admin-muted font-normal">{p.nextStep}</small>
                  </span>
                  <ChevronRight size={16} className="admin-task-chevron text-admin-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </li>
            ))}
          </ul>
        </TaskCard>
      </Stagger>

      <div className="admin-section-title">
        <h2 className="text-base font-bold text-admin-fg m-0">Site health</h2>
        <span className="text-xs text-admin-muted">These jobs run automatically</span>
      </div>
      <div className="admin-health-panel bg-admin-surface border border-admin-border rounded-admin-lg p-5 shadow-admin-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
        <div className="admin-health-item flex items-start gap-3 flex-1 min-w-0">
          <span className={`admin-health-icon p-2 rounded-admin shrink-0 ${
            priceStatus === 'ok' ? 'bg-admin-ok-subtle text-admin-ok' : priceStatus === 'err' ? 'bg-admin-destructive-subtle text-admin-destructive' : 'bg-admin-muted-bg text-admin-muted'
          }`}>
            <Tag size={16} />
          </span>
          <div className="min-w-0">
            <div className="admin-health-title text-sm font-semibold text-admin-fg">Price updates</div>
            <div className="admin-health-text text-xs text-admin-muted mt-0.5 leading-relaxed">
              {priceStatus === 'idle' && 'Not run yet. Prices are checked automatically every morning.'}
              {priceStatus === 'ok' && <>Last updated <b>{timeAgo(data.lastRun!.at)}</b>{data.lastRun!.failed > 0 ? `, ${plural(data.lastRun!.failed, 'product')} couldn't be checked` : ', all good'}.</>}
              {priceStatus === 'warn' && <>Updating right now (started <b>{timeAgo(data.lastRun!.at)}</b>).</>}
              {priceStatus === 'err' && <>The last update <b>{timeAgo(data.lastRun!.at)}</b> hit a problem. Open the details below.</>}
            </div>
          </div>
        </div>
        <div className="admin-health-item flex items-start gap-3 flex-1 min-w-0">
          <span className={`admin-health-icon p-2 rounded-admin shrink-0 ${
            aiTotal === 0 ? 'bg-admin-muted-bg text-admin-muted' : data.ai.failed > data.ai.ok ? 'bg-admin-warn-subtle text-admin-warn' : 'bg-admin-ok-subtle text-admin-ok'
          }`}>
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <div className="admin-health-title text-sm font-semibold text-admin-fg">AI writing assistant</div>
            <div className="admin-health-text text-xs text-admin-muted mt-0.5 leading-relaxed">
              {aiTotal === 0 ? (
                'No pages written in the last 7 days.'
              ) : (
                <>
                  <b>{plural(data.ai.ok, 'page')}</b> written in the last 7 days
                  {data.ai.failed > 0 && <>; {plural(data.ai.failed, 'attempt')} failed and {data.ai.failed === 1 ? 'was' : 'were'} retried automatically</>}.
                </>
              )}
            </div>
          </div>
        </div>
        <MotionButton className="admin-btn admin-btn-ghost admin-btn-sm admin-health-toggle shrink-0 self-start md:self-auto" onClick={() => setShowSystem((s) => !s)} aria-expanded={showSystem}>
          <Info size={14} />
          {showSystem ? 'Hide technical details' : 'Technical details'}
          <motion.span style={{ display: 'inline-flex' }} animate={{ rotate: showSystem ? 180 : 0 }} transition={spring}>
            <ChevronDown size={14} />
          </motion.span>
        </MotionButton>
      </div>
      <AnimatePresence initial={false}>
        {showSystem && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={softSpring}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <OverviewTab />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
