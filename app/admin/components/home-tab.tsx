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
    <motion.div className={`admin-next-step is-${tone}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
      <span className="admin-next-step-icon">{icon}</span>
      <div className="admin-next-step-body">
        <div className="admin-next-step-title">{title}</div>
        <p>{text}</p>
      </div>
      <div className="admin-next-step-actions">
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
    <section className="admin-pipeline-wrap" aria-labelledby="pipeline-title">
      <div className="admin-section-title">
        <h2 id="pipeline-title">How your content is moving</h2>
        <span className="admin-text-xs admin-text-muted">Every product goes through these four steps</span>
      </div>
      <ol className="admin-pipeline">
        {steps.map((s, i) => (
          <li key={s.label} className={s.highlight ? 'is-highlight' : undefined}>
            <Link href={s.href} className="admin-pipeline-step">
              <span className="admin-pipeline-top">
                <span className="admin-pipeline-icon">{s.icon}</span>
                <span className="admin-pipeline-num">Step {i + 1}</span>
              </span>
              <AnimatedNumber value={s.count} className="admin-pipeline-count" />
              <span className="admin-pipeline-label">{s.label}</span>
              <span className="admin-pipeline-hint">{s.hint}</span>
            </Link>
            {i < steps.length - 1 && <ChevronRight size={16} className="admin-pipeline-arrow" aria-hidden />}
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
    <StaggerItem className="admin-task-card" lift>
      <div id={id} className="admin-task-head">
        <span className="admin-task-icon">{icon}</span>
        <div className="admin-task-titles">
          <div className="admin-task-title">
            {title}
            <span className={`admin-task-pill${count > 0 ? ' has-items' : ''}`}>{count}</span>
          </div>
          <div className="admin-task-hint">{hint}</div>
        </div>
      </div>
      {count === 0 ? (
        <div className="admin-task-empty">
          <CircleCheck size={16} /> {empty}
        </div>
      ) : (
        children
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
    <motion.div className="admin-greeting" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
      <Avatar name={identity.displayName} src={identity.avatar} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>
          {greeting()}, {firstName}
        </h1>
        <p className="admin-greeting-sub">Here&apos;s what needs you today.</p>
      </div>
      <MotionButton className="admin-btn admin-btn-secondary admin-btn-sm admin-refresh-btn" onClick={() => refresh()} disabled={isRefreshing} title="Refresh" aria-label="Refresh">
        <motion.span style={{ display: 'inline-flex' }} animate={{ rotate: isRefreshing ? 360 : 0 }} transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : spring}>
          <RotateCw size={14} />
        </motion.span>
        <span className="admin-refresh-label">Refresh</span>
      </MotionButton>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <StatsSkeleton />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div>
        {header}
        <EmptyState title="Couldn't load your dashboard" description={error ?? 'Something went wrong. Try Refresh.'} />
      </div>
    );
  }

  const priceStatus = data.lastRun?.error ? 'err' : data.lastRun?.running ? 'warn' : data.lastRun ? 'ok' : 'idle';
  const aiTotal = data.ai.ok + data.ai.failed;

  return (
    <div className="admin-home">
      {header}
      <NextStep data={data} />
      <Pipeline data={data} />

      <div className="admin-section-title">
        <h2>Your to-do list</h2>
      </div>
      <Stagger className="admin-home-grid">
        <TaskCard
          id="ready"
          icon={<ShieldCheck size={18} />}
          title="Approve products"
          count={data.readyCount}
          hint="All facts are checked. Give your OK to publish."
          empty="Nothing to approve right now."
        >
          <ul className="admin-task-list">
            <AnimatePresence initial={false}>
              {data.readyToApprove.map((p) => (
                <motion.li key={p.id} layout exit={{ opacity: 0, x: 40, height: 0 }} transition={spring}>
                  <div className="admin-task-row">
                    <Link href={`/admin/products/${p.id}`} className="admin-task-row-main">
                      {p.title}
                      <small>{p.category}</small>
                    </Link>
                    <MotionButton className="admin-btn admin-btn-primary admin-btn-sm" disabled={approving === p.id} onClick={() => approve(p)}>
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
          <ul className="admin-task-list">
            {data.copyToReview.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/content/${c.id}`} className="admin-task-row">
                  <span className="admin-task-row-main">
                    {c.pageKey}
                    <small>{PAGE_TYPE_LABEL[c.pageType]}</small>
                  </span>
                  <ChevronRight size={16} className="admin-task-chevron" />
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
              <Link href="/admin?tab=products" className="admin-task-more">
                See all {data.needsWorkCount} <ArrowRight size={14} />
              </Link>
            )
          }
        >
          <ul className="admin-task-list">
            {data.needsWork.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="admin-task-row">
                  <span className="admin-task-row-main">
                    {p.title}
                    <small>{p.nextStep}</small>
                  </span>
                  <ChevronRight size={16} className="admin-task-chevron" />
                </Link>
              </li>
            ))}
          </ul>
        </TaskCard>
      </Stagger>

      <div className="admin-section-title">
        <h2>Site health</h2>
        <span className="admin-text-xs admin-text-muted">These jobs run automatically</span>
      </div>
      <div className="admin-health-panel">
        <div className="admin-health-item">
          <span className={`admin-health-icon is-${priceStatus}`}>
            <Tag size={16} />
          </span>
          <div>
            <div className="admin-health-title">Price updates</div>
            <div className="admin-health-text">
              {priceStatus === 'idle' && 'Not run yet. Prices are checked automatically every morning.'}
              {priceStatus === 'ok' && <>Last updated <b>{timeAgo(data.lastRun!.at)}</b>{data.lastRun!.failed > 0 ? `, ${plural(data.lastRun!.failed, 'product')} couldn't be checked` : ', all good'}.</>}
              {priceStatus === 'warn' && <>Updating right now (started <b>{timeAgo(data.lastRun!.at)}</b>).</>}
              {priceStatus === 'err' && <>The last update <b>{timeAgo(data.lastRun!.at)}</b> hit a problem. Open the details below.</>}
            </div>
          </div>
        </div>
        <div className="admin-health-item">
          <span className={`admin-health-icon is-${aiTotal === 0 ? 'idle' : data.ai.failed > data.ai.ok ? 'warn' : 'ok'}`}>
            <Sparkles size={16} />
          </span>
          <div>
            <div className="admin-health-title">AI writing assistant</div>
            <div className="admin-health-text">
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
        <MotionButton className="admin-btn admin-btn-ghost admin-btn-sm admin-health-toggle" onClick={() => setShowSystem((s) => !s)} aria-expanded={showSystem}>
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
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 16 }}>
              <OverviewTab />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
