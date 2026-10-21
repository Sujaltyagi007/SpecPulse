import React from 'react';

export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; }) {
  return (
    <div className={`admin-card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', style, }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; }) {
  return (
    <div className={`admin-card-header ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', style, }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; }) {
  return (
    <h3 className={`admin-card-title ${className}`} style={style}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', style, }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; }) {
  return (
    <p className={`admin-card-description ${className}`} style={style}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', noPadding = false, style, }: { children: React.ReactNode; className?: string; noPadding?: boolean; style?: React.CSSProperties; }) {
  return (
    <div className={`admin-card-content ${noPadding ? 'no-padding' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', style, }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; }) {
  return (
    <div className={`admin-card-footer ${className}`} style={style}>
      {children}
    </div>
  );
}
