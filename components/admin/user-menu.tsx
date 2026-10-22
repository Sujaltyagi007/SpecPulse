'use client';
import Link from 'next/link';
import { Avatar } from './avatar';
import { spring } from './motion';
import { useAdmin } from './theme-root';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, KeyRound, Palette, UserRound } from 'lucide-react';

export function UserMenu() {
  const { identity } = useAdmin();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        className="admin-user-button flex items-center gap-2.5 rounded-admin px-2 py-1.5 text-sm font-medium text-admin-fg transition-colors hover:bg-admin-muted-bg border border-transparent hover:border-admin-border"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.96 }}
        transition={spring}
      >
        <Avatar name={identity.displayName} src={identity.avatar} size={28} />
        <span className="admin-user-name hidden sm:inline-block font-medium">{identity.displayName}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="admin-user-menu absolute right-0 top-full mt-2 z-50 w-56 rounded-admin-lg border border-admin-border bg-admin-surface p-1.5 shadow-admin-xl"
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.12 } }}
            transition={spring}
          >
            <div className="admin-user-menu-head flex items-center gap-3 border-b border-admin-border p-2.5 pb-3 mb-1">
              <Avatar name={identity.displayName} src={identity.avatar} size={38} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{identity.displayName}</div>
                <div className="text-xs text-admin-muted">{identity.role ?? `@${identity.username}`}</div>
              </div>
            </div>
            {[
              { href: '/admin/settings', icon: <UserRound size={15} />, label: 'Edit profile' },
              { href: '/admin/settings#appearance', icon: <Palette size={15} />, label: 'Appearance' },
              { href: '/admin/settings/integrations', icon: <KeyRound size={15} />, label: 'AI & API keys' },
            ].map((item, i) => (
              <motion.div key={item.href} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.04 * (i + 1) }}>
                <Link
                  href={item.href}
                  className="admin-menu-item flex items-center gap-2.5 rounded-admin-sm px-2.5 py-1.5 text-sm text-admin-fg transition-colors hover:bg-admin-muted-bg"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.12 }}>
              <Link
                href="/"
                target="_blank"
                className="admin-menu-item flex items-center gap-2.5 rounded-admin-sm px-2.5 py-1.5 text-sm text-admin-fg transition-colors hover:bg-admin-muted-bg"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <ExternalLink size={15} />
                View public site
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
