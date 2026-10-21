'use client';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import type { PageType } from '@/lib/content/facts';
import {
  Sparkles,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCw,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { generateContent } from '@/app/admin/content-actions';

export type GenStepKey = 'facts' | 'llm' | 'checks' | 'saving';

interface StepDef {
  key: GenStepKey;
  title: string;
  desc: string;
  icon: React.ReactNode;
  iconClass: string;
}

const STEPS: StepDef[] = [
  {
    key: 'facts',
    title: 'Gathering Verified Specifications',
    desc: 'Querying catalog specs, benchmark data, and retailer offer records',
    icon: <Database size={18} />,
    iconClass: 'facts',
  },
  {
    key: 'llm',
    title: 'AI Editorial Synthesis & Structuring',
    desc: 'Drafting executive buyer summary, detailed body, and shopper FAQs',
    icon: <Cpu size={18} />,
    iconClass: 'llm',
  },
  {
    key: 'checks',
    title: 'Scripted Anti-Hallucination Audit',
    desc: 'Cross-referencing all drafted claims against ground-truth database facts',
    icon: <ShieldCheck size={18} />,
    iconClass: 'checks',
  },
  {
    key: 'saving',
    title: 'Finalizing & Saving Record',
    desc: 'Persisting editorial draft to database and preparing review studio',
    icon: <Sparkles size={18} />,
    iconClass: 'saving',
  },
];

const LLM_TIPS = [
  'Synthesizing key buying trade-offs & practical advice...',
  'Structuring verified specifications into readable takeaways...',
  'Formulating targeted shopper FAQs without marketing fluff...',
  'Filtering out ungrounded claims and pricing assumptions...',
];

export interface ContentGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageType: PageType;
  pageKey: string;
  back?: string;
  hasCopy: boolean;
  onSuccess?: (id: number) => void;
}

export function ContentGenerateModal({
  open,
  onOpenChange,
  pageType,
  pageKey,
  back,
  hasCopy,
  onSuccess,
}: ContentGenerateModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'confirm' | 'running' | 'done' | 'error'>('confirm');
  const [activeStep, setActiveStep] = useState<GenStepKey>('facts');
  const [completedSteps, setCompletedSteps] = useState<Set<GenStepKey>>(new Set());
  const [stepDetail, setStepDetail] = useState<string>('Initializing verification pipeline...');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [progressPercent, setProgressPercent] = useState(10);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [llmTipIdx, setLlmTipIdx] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset state whenever modal opens
  useEffect(() => {
    if (open) {
      setPhase('confirm');
      setActiveStep('facts');
      setCompletedSteps(new Set());
      setStepDetail('Initializing verification pipeline...');
      setElapsedSec(0);
      setProgressPercent(10);
      setErrorMsg('');
      setLlmTipIdx(0);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [open]);

  // Elapsed timer ticker when running
  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Rotating sub-messages during LLM step
  useEffect(() => {
    if (phase !== 'running' || activeStep !== 'llm') return;
    const t = setInterval(() => {
      setLlmTipIdx((i) => (i + 1) % LLM_TIPS.length);
    }, 4500);
    return () => clearInterval(t);
  }, [phase, activeStep]);

  const advanceToStep = (step: GenStepKey, detail?: string) => {
    setActiveStep(step);
    if (detail) setStepDetail(detail);

    setCompletedSteps((prev) => {
      const next = new Set(prev);
      const stepIdx = STEPS.findIndex((s) => s.key === step);
      STEPS.forEach((s, idx) => {
        if (idx < stepIdx) next.add(s.key);
      });
      return next;
    });

    if (step === 'facts') setProgressPercent(25);
    else if (step === 'llm') setProgressPercent(60);
    else if (step === 'checks') setProgressPercent(86);
    else if (step === 'saving') setProgressPercent(96);
  };

  const startGeneration = async () => {
    setPhase('running');
    setElapsedSec(0);
    advanceToStep('facts', 'Loading verified catalog facts and retailer pricing records...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Try real-time streaming endpoint
      const response = await fetch('/admin/content/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageKey }),
        signal: controller.signal,
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const clean = line.replace(/^data:\s*/, '').trim();
            if (!clean) continue;
            try {
              const event = JSON.parse(clean);
              if (event.step === 'error') {
                throw new Error(event.error || 'Content generation failed');
              }
              if (event.step === 'done') {
                setProgressPercent(100);
                setCompletedSteps(new Set(['facts', 'llm', 'checks', 'saving']));
                setPhase('done');
                setStepDetail('Editorial draft completed & verified!');
                setTimeout(() => {
                  if (onSuccess) onSuccess(event.id);
                  onOpenChange(false);
                  router.push(event.url || `/admin/content/${event.id}`);
                }, 1100);
                return;
              }
              if (event.step === 'facts' || event.step === 'llm' || event.step === 'checks' || event.step === 'saving') {
                advanceToStep(event.step, event.detail);
              }
            } catch (err) {
              if (err instanceof Error && err.name !== 'SyntaxError') throw err;
            }
          }
        }
      } else {
        // Fallback: If streaming endpoint is unavailable, execute server action with realistic timed steps
        const formData = new FormData();
        formData.append('pageType', pageType);
        formData.append('pageKey', pageKey);
        formData.append('back', back || '/admin/content');

        const stepTimer1 = setTimeout(() => advanceToStep('llm', 'AI model is synthesizing buying guide and FAQs...'), 1400);
        const stepTimer2 = setTimeout(() => advanceToStep('checks', 'Auditing drafted claims against catalog specs...'), 18000);
        const stepTimer3 = setTimeout(() => advanceToStep('saving', 'Finalizing verified database record...'), 24000);

        await generateContent(formData);
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        clearTimeout(stepTimer3);

        setProgressPercent(100);
        setCompletedSteps(new Set(['facts', 'llm', 'checks', 'saving']));
        setPhase('done');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setPhase('error');
      setErrorMsg((err as Error).message || 'Generation failed. Please try again.');
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}s`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="admin-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => phase !== 'running' && onOpenChange(false)}
        >
          <motion.div
            className="admin-gen-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gen-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            {/* Modal Header */}
            <div className="admin-gen-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`admin-gen-badge ${phase === 'running' ? 'running' : phase === 'done' ? 'done' : ''}`}>
                  {phase === 'running' ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Live Generation
                    </>
                  ) : phase === 'done' ? (
                    <>
                      <CheckCircle2 size={12} />
                      Complete
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      AI Copy Studio
                    </>
                  )}
                </span>
                <span className="admin-text-xs admin-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {pageType} · {pageKey}
                </span>
              </div>

              {phase === 'running' && (
                <div className="admin-gen-timer">
                  <Clock size={12} />
                  <span>{formatTime(elapsedSec)}</span>
                </div>
              )}

              {phase !== 'running' && (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  style={{ padding: 4 }}
                  onClick={() => onOpenChange(false)}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Glowing animated progress line */}
            <div className="admin-gen-progress-bar-wrap">
              <motion.div
                className="admin-gen-progress-fill"
                style={{ width: `${progressPercent}%` }}
                layout
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Modal Body: Confirmation or Active Stepper */}
            <div className="admin-gen-body">
              {phase === 'confirm' ? (
                <div>
                  <h3 id="gen-title" style={{ fontSize: '1.1875rem', fontWeight: 700, margin: '4px 0 8px' }}>
                    {hasCopy ? 'Regenerate Editorial Copy?' : 'Generate Editorial Copy'}
                  </h3>
                  <p className="admin-dialog-description" style={{ marginBottom: 18 }}>
                    SpecPulse synthesizes buying advice, trade-offs, and shopper FAQs strictly from verified ground-truth specs.
                    Every claim is automatically audited to prevent hallucinations.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                    <div className="admin-gen-step-card pending">
                      <div className="admin-gen-icon-box facts"><Database size={16} /></div>
                      <div>
                        <div className="admin-gen-step-title">1. Fact Ingestion</div>
                        <div className="admin-gen-step-desc">Extracts catalog specs and verified offers</div>
                      </div>
                    </div>
                    <div className="admin-gen-step-card pending">
                      <div className="admin-gen-icon-box llm"><Cpu size={16} /></div>
                      <div>
                        <div className="admin-gen-step-title">2. AI Synthesis</div>
                        <div className="admin-gen-step-desc">Structures summary, pros/cons, and shopper FAQs</div>
                      </div>
                    </div>
                    <div className="admin-gen-step-card pending">
                      <div className="admin-gen-icon-box checks"><ShieldCheck size={16} /></div>
                      <div>
                        <div className="admin-gen-step-title">3. Fact Auditing</div>
                        <div className="admin-gen-step-desc">Automated check against ground truth database</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {STEPS.map((step) => {
                    const isDone = completedSteps.has(step.key);
                    const isActive = activeStep === step.key && phase === 'running';
                    const isPending = !isDone && !isActive;

                    return (
                      <motion.div
                        key={step.key}
                        className={`admin-gen-step-card ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}
                        layout
                        transition={{ duration: 0.25 }}
                      >
                        {/* Distinct animated icon box for every step */}
                        <div className={`admin-gen-icon-box ${step.iconClass}`}>
                          {isDone ? <Check size={18} strokeWidth={2.8} /> : isActive ? step.icon : step.icon}
                        </div>

                        <div className="admin-gen-step-content">
                          <div className="admin-gen-step-title-row">
                            <span className="admin-gen-step-title">
                              {step.title}
                              {isActive && (
                                <span className="admin-gen-dots">
                                  <span />
                                  <span />
                                  <span />
                                </span>
                              )}
                            </span>

                            {isDone && (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--admin-ok)' }}>
                                Verified
                              </span>
                            )}
                            {isActive && (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--admin-accent)' }}>
                                In Progress
                              </span>
                            )}
                          </div>

                          <div className="admin-gen-step-desc">
                            {isActive ? (
                              step.key === 'llm' ? LLM_TIPS[llmTipIdx] : stepDetail
                            ) : (
                              step.desc
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Error Message Display */}
              {phase === 'error' && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'var(--admin-destructive-subtle, #fef2f2)',
                    border: '1px solid var(--admin-destructive-border, #fecaca)',
                    color: 'var(--admin-destructive, #ef4444)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.8125rem',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>{errorMsg}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="admin-gen-footer">
              {phase === 'confirm' ? (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={startGeneration}
                  >
                    <Sparkles size={14} />
                    {hasCopy ? 'Regenerate Editorial Copy' : 'Start Generation'}
                  </button>
                </>
              ) : phase === 'running' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
                    <Loader2 size={13} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
                    <span>Processing verified specs with AI pool...</span>
                  </div>
                  <span className="admin-text-xs admin-text-muted">Do not close window</span>
                </>
              ) : phase === 'done' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--admin-ok)', fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>Generation Complete! Redirecting to studio...</span>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--admin-ok)' }} />
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={startGeneration}
                  >
                    <RotateCw size={14} />
                    Try Again
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
