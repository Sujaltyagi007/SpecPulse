import React from 'react';

export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`admin-card rounded-admin border border-admin-border bg-admin-card text-admin-card-fg shadow-admin transition-all duration-200 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`admin-card-header flex items-center justify-between gap-4 p-5 border-b border-admin-border/60 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <h3 className={`admin-card-title text-base font-semibold leading-none tracking-tight text-admin-fg ${className}`} style={style}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={`admin-card-description text-sm text-admin-muted mt-1 ${className}`} style={style}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', noPadding = false, style }: { children: React.ReactNode; className?: string; noPadding?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`admin-card-content ${noPadding ? 'p-0' : 'p-5'} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`admin-card-footer flex items-center p-5 pt-0 border-t border-admin-border/60 mt-4 ${className}`} style={style}>
      {children}
    </div>
  );
}
