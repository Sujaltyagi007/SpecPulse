'use client';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastActions {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<{ toast: ToastActions } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const toastActions: ToastActions = {
    success: (title, description) => addToast('success', title, description),
    error: (title, description) => addToast('error', title, description),
    info: (title, description) => addToast('info', title, description),
  };

  return (
    <ToastContext.Provider value={{ toast: toastActions }}>
      {children}
      <div className="admin-toast-container" aria-live="polite">
        <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`admin-toast admin-toast-${t.type}`}
            role="status"
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.6 }}
            onDragEnd={(_, info) => info.offset.x > 80 && removeToast(t.id)}
          >
            {t.type === 'success' && <CheckCircle2 size={18} style={{ color: 'var(--admin-ok)', flexShrink: 0, marginTop: 2 }} />}
            {t.type === 'error' && <AlertCircle size={18} style={{ color: 'var(--admin-destructive)', flexShrink: 0, marginTop: 2 }} />}
            {t.type === 'info' && <Info size={18} style={{ color: 'var(--admin-accent)', flexShrink: 0, marginTop: 2 }} />}
            <div className="admin-toast-content">
              <div className="admin-toast-title">{t.title}</div>
              {t.description && <div className="admin-toast-desc">{t.description}</div>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="admin-toast-close"
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  const fallback: ToastActions = {
    success: (title: string, desc?: string) => console.log('Toast success:', title, desc),
    error: (title: string, desc?: string) => console.error('Toast error:', title, desc),
    info: (title: string, desc?: string) => console.log('Toast info:', title, desc),
  };
  const actions = ctx ? ctx.toast : fallback;
  return {
    toast: actions,
    ...actions,
  };
}
