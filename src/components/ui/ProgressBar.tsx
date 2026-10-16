import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  const getColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500 dark:bg-emerald-400';
    if (pct >= 80) return 'bg-blue-600 dark:bg-blue-500';
    if (pct >= 50) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-rose-500 dark:bg-rose-400';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-xs">
        {showLabel && (
          <>
            <span className="text-slate-500 dark:text-slate-400">Readiness</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {clamped}%
            </span>
          </>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${
          size === 'sm' ? 'h-1.5' : 'h-2'
        }`}
      >
        <div
          className={`h-full transition-all duration-300 ${getColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
