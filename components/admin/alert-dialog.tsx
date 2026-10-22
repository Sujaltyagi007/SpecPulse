'use client';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import React, { createContext, useContext, useState, useRef, useEffect, Fragment } from 'react';

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};
const panelMotion = {
  initial: { opacity: 0, scale: 0.88, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.94, y: 8, transition: { duration: 0.12 } },
  transition: { type: 'spring' as const, stiffness: 420, damping: 30 },
};
const iconMotion = {
  initial: { scale: 0, rotate: -30 },
  animate: { scale: 1, rotate: 0 },
  transition: { type: 'spring' as const, stiffness: 500, damping: 15, delay: 0.08 },
};

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'destructive';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; options: ConfirmOptions; resolve: ((value: boolean) => void) | null; }>({
    isOpen: false,
    options: { title: '', description: '' },
    resolve: null,
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({ isOpen: true, options, resolve });
    });
  };

  const handleClose = (result: boolean) => {
    if (dialogState.resolve) { dialogState.resolve(result) }
    setDialogState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (dialogState.isOpen && e.key === 'Escape') { handleClose(false) } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState.isOpen]);

  const { title, description, confirmText = 'Continue', cancelText = 'Cancel', tone = 'primary' } = dialogState.options;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {dialogState.isOpen && (
          <motion.div key="confirm" className="admin-dialog-backdrop" onClick={() => handleClose(false)} {...backdropMotion}>
            <motion.div className="admin-dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc" onClick={(e) => e.stopPropagation()} {...panelMotion}>
              <div className="admin-dialog-header">
                <motion.div className={`admin-dialog-icon ${tone}`} {...iconMotion}>
                  {tone === 'destructive' ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
                </motion.div>
                <div>
                  <h3 id="dialog-title" className="admin-dialog-title">{title}</h3>
                  <p id="dialog-desc" className="admin-dialog-description">{description}</p>
                </div>
              </div>
              <div className="admin-dialog-footer">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => handleClose(false)} autoFocus> {cancelText} </button>
                <button type="button" className={`admin-btn ${tone === 'destructive' ? 'admin-btn-destructive' : 'admin-btn-primary'}`} onClick={() => handleClose(true)}>{confirmText}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async (options: ConfirmOptions) => window.confirm(`${options.title}\n\n${options.description}`);
  }
  return ctx.confirm;
}

export function AlertDialog({ open, onOpenChange, title, description, confirmText = 'Continue', cancelText = 'Cancel', tone = 'primary', isLoading = false, onConfirm, }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmText?: string; cancelText?: string; tone?: 'primary' | 'destructive'; isLoading?: boolean; onConfirm: () => void | Promise<void>; }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="alert" className="admin-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isLoading && onOpenChange(false)} {...backdropMotion}>
          <motion.div className="admin-dialog-panel w-full max-w-md rounded-admin-lg border border-admin-border bg-admin-surface p-6 shadow-admin-xl text-admin-fg" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} {...panelMotion}>
            <div className="admin-dialog-header flex items-start gap-4 mb-4">
              <motion.div className={`admin-dialog-icon shrink-0 rounded-full p-2.5 ${tone === 'destructive' ? 'bg-admin-destructive/10 text-admin-destructive' : 'bg-admin-accent/10 text-admin-accent'}`} {...iconMotion}>
                {tone === 'destructive' ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
              </motion.div>
              <div className="min-w-0 flex-1">
                <h3 className="admin-dialog-title text-base font-semibold leading-6 text-admin-fg">{title}</h3>
                <p className="admin-dialog-description mt-1 text-sm text-admin-muted leading-5">{description}</p>
              </div>
            </div>

            <div className="admin-dialog-footer flex items-center justify-end gap-2.5 mt-6">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={isLoading} onClick={() => onOpenChange(false)}> {cancelText} </button>
              <button type="button" className={`admin-btn ${tone === 'destructive' ? 'admin-btn-destructive' : 'admin-btn-primary'}`} disabled={isLoading} onClick={onConfirm}>
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


export function ConfirmFormButton({ children, dialogTitle, dialogDescription, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'primary', className = '', disabled = false, formAction, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { dialogTitle: string; dialogDescription: string; confirmText?: string; cancelText?: string; tone?: 'primary' | 'destructive'; formAction?: (formData: FormData) => void | Promise<void>; }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleConfirmed = async () => {
    setIsPending(true);
    try {
      const form = buttonRef.current?.closest('form');
      if (formAction && form) {
        const formData = new FormData(form);
        await formAction(formData);
      } else if (form) {
        form.requestSubmit(buttonRef.current ?? undefined);
      }
    } finally {
      setIsPending(false);
      setOpen(false);
    }
  };

  return (
    <Fragment>
      <button ref={buttonRef} type="button" disabled={disabled || isPending} className={className || `admin-btn ${tone === 'destructive' ? 'admin-btn-destructive' : 'admin-btn-secondary'}`} onClick={() => setOpen(true)} {...props} >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
        {children}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen} title={dialogTitle} description={dialogDescription} confirmText={confirmText} cancelText={cancelText} tone={tone} isLoading={isPending} onConfirm={handleConfirmed} />
    </Fragment>
  );
}
