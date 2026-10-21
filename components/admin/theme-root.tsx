'use client';
import { MotionConfig } from 'motion/react';
import { ResponsiveTables } from './responsive-tables';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { themeAttributes, themeStyle, type AdminTheme } from '@/lib/admin-theme';

export interface AdminIdentity {
  username: string;
  displayName: string;
  role: string | null;
  avatar: string | null;
}

interface AdminContextValue {
  theme: AdminTheme;
  savedTheme: AdminTheme;
  previewTheme: (t: AdminTheme | null) => void;
  identity: AdminIdentity;
  setIdentity: (i: AdminIdentity) => void;
  setSavedTheme: (t: AdminTheme) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);


export function AdminThemeRoot({ initialTheme, identity: initialIdentity, children }: {
  initialTheme: AdminTheme;
  identity: AdminIdentity;
  children: React.ReactNode;
}) {
  const [savedTheme, setSavedTheme] = useState(initialTheme);
  const [preview, setPreview] = useState<AdminTheme | null>(null);
  const [identity, setIdentity] = useState(initialIdentity);
  const theme = preview ?? savedTheme;

  const value = useMemo<AdminContextValue>(
    () => ({ theme, savedTheme, previewTheme: setPreview, identity, setIdentity, setSavedTheme }),
    [theme, savedTheme, identity],
  );

  return (
    <AdminContext.Provider value={value}>
      <MotionConfig reducedMotion={theme.motion === 'reduced' ? 'always' : 'user'}>
        <div className="admin-theme-root" {...themeAttributes(theme)} style={themeStyle(theme)}>
          <ResponsiveTables />
          {children}
        </div>
      </MotionConfig>
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminThemeRoot');
  return ctx;
}
