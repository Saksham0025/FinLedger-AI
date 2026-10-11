import React from 'react';
import { formatDate } from '../../utils/formatters';

interface DateDisplayProps {
  date: string | null | undefined;
  className?: string;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({ date, className = '' }) => {
  return (
    <span className={`text-slate-400 font-mono text-xs tabular-nums ${className}`}>
      {formatDate(date)}
    </span>
  );
};
