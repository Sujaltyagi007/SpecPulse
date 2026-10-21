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

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; ariaLabel: string; }) {
  const pillId = `segment-${useId()}`;
  return (
    <div className="admin-segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <motion.button key={o.value} type="button" role="tab" aria-selected={active} className={`admin-segment ${active ? 'active' : ''}`} onClick={() => onChange(o.value)} whileTap={{ scale: 0.94 }} transition={spring}>
            {active && <motion.span layoutId={pillId} className="admin-segment-pill" transition={spring} />}
            <span>
              {o.icon}
              {o.label}
              {o.count !== undefined && <span className="admin-segment-count">{o.count}</span>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
