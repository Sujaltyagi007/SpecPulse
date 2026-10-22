'use client';
import { spring } from './motion';
import React, { useId } from 'react';
import { motion } from 'motion/react';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; ariaLabel: string }) {
  const pillId = `segment-${useId()}`;
  return (
    <div className="admin-segmented inline-flex items-center gap-1 rounded-admin bg-admin-muted-bg p-1 border border-admin-border/50 text-xs font-medium" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <motion.button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`admin-segment relative flex items-center gap-1.5 rounded-admin-sm px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'active text-admin-fg font-semibold' : 'text-admin-muted hover:text-admin-fg'
            }`}
            onClick={() => onChange(o.value)}
            whileTap={{ scale: 0.94 }}
            transition={spring}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="admin-segment-pill absolute inset-0 rounded-admin-sm bg-admin-surface shadow-admin-sm border border-admin-border/50"
                transition={spring}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {o.icon}
              <span>{o.label}</span>
              {o.count !== undefined && (
                <span className="admin-segment-count ml-1 rounded-full bg-admin-muted-bg px-1.5 py-0.5 text-[10px] text-admin-muted">
                  {o.count}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
