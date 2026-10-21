'use client';
import Link from 'next/link';
import { Avatar } from './avatar';
import { spring } from './motion';
import { useAdmin } from './theme-root';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Palette, UserRound } from 'lucide-react';

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
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button type="button" className="admin-user-button"
        aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.96 }} transition={spring}
      >
        <Avatar name={identity.displayName} src={identity.avatar} size={28} />
        <span className="admin-user-name">{identity.displayName}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div role="menu" className="admin-user-menu"
            initial={{ opacity: 0, scale: 0.9, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.12 } }} transition={spring}
          >
            <div className="admin-user-menu-head">
              <Avatar name={identity.displayName} src={identity.avatar} size={38} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{identity.displayName}</div>
                <div className="admin-text-xs admin-text-muted">{identity.role ?? `@${identity.username}`}</div>
              </div>
            </div>
            {[
              { href: '/admin/settings', icon: <UserRound size={15} />, label: 'Edit profile' },
              { href: '/admin/settings#appearance', icon: <Palette size={15} />, label: 'Appearance' },
            ].map((item, i) => (
              <motion.div key={item.href} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.04 * (i + 1) }}>
                <Link href={item.href} className="admin-menu-item" role="menuitem" onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.12 }}>
              <Link href="/" target="_blank" className="admin-menu-item" role="menuitem" onClick={() => setOpen(false)}>
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
