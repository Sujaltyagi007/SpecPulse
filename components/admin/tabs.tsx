'use client';
import { motion } from 'motion/react';
import { softSpring, spring } from './motion';
import React, { createContext, useContext, useId, useState } from 'react';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
  pillId: string;
}

const TabsContext = createContext<TabsContextType | null>(null);

export function Tabs({ value, defaultValue, onValueChange, children, className = '' }: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const activeValue = value !== undefined ? value : internalValue;
  const pillId = `tab-pill-${useId()}`;

  const handleValueChange = (val: string) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange, pillId }}>
      <div className={`admin-tabs ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string; }) {
  return (
    <div className={`admin-tabs-list ${className}`} role="tablist">
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, badge, icon, disabled = false, className = '' }: {
  value: string;
  children: React.ReactNode;
  badge?: number | string | null;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = ctx.value === value;

  return (
    <motion.button type="button" role="tab" aria-selected={isActive} disabled={disabled} className={`admin-tab-trigger ${isActive ? 'active' : ''} ${className}`} onClick={() => ctx.onValueChange(value)} whileTap={{ scale: 0.95 }} transition={spring}>
      {isActive && <motion.span layoutId={ctx.pillId} className="admin-tab-pill" transition={spring} />}
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && badge !== null && (
        <motion.span key={String(badge)} className="admin-tab-badge" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 18 }}>
          {badge}
        </motion.span>
      )}
    </motion.button>
  );
}


export function TabsContent({ value, children, className = '' }: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used within Tabs');

  if (ctx.value !== value) { return null }

  return (
    <motion.div key={value} role="tabpanel"
      className={`admin-tab-content ${className}`}
      initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={softSpring}>
      {children}
    </motion.div>
  );
}
