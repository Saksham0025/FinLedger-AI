import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  glow?: 'emerald' | 'amber' | 'rose' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  glow = 'none',
}) => {
  const glowStyles = {
    emerald: 'border-emerald-500/30 hover:border-emerald-500/50',
    amber: 'border-amber-500/30 hover:border-amber-500/50',
    rose: 'border-rose-500/30 hover:border-rose-500/50',
    none: 'border-slate-800/80',
  };

  return (
    <div
      className={`glass-panel rounded-xl overflow-hidden transition-all duration-200 ${glowStyles[glow]} ${className}`}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-800/70 flex items-center justify-between gap-4">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide uppercase">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
