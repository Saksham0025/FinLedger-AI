import React from 'react';
import { formatINR } from '../../utils/formatters';

interface CurrencyDisplayProps {
  amount: string | number | null | undefined;
  className?: string;
  sign?: 'auto' | 'plus' | 'minus' | 'none';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  colored?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className = '',
  sign = 'none',
  size = 'md',
  colored = false,
}) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  const formatted = formatINR(Math.abs(num));

  const sizeStyles = {
    sm: 'text-xs font-medium',
    md: 'text-sm font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-bold tracking-tight',
    '2xl': 'text-3xl font-extrabold tracking-tight',
  };

  let signText = '';
  let colorClass = 'text-ink-950 [.theme-forensic_&]:text-slate-100';

  if (sign === 'plus' || (sign === 'auto' && num > 0)) {
    signText = '+';
    if (colored) colorClass = 'text-forest-800 [.theme-forensic_&]:text-emerald-400';
  } else if (sign === 'minus' || (sign === 'auto' && num < 0)) {
    signText = '-';
    if (colored) colorClass = 'text-copper-700 [.theme-forensic_&]:text-rose-400';
  }

  return (
    <span className={`font-mono tabular-nums ${sizeStyles[size]} ${colorClass} ${className}`}>
      {signText}
      {formatted}
    </span>
  );
};
