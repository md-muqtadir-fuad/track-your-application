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

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-serif italic text-[#000000]/70">Readiness Index</span>
          <span className="font-mono font-bold text-[#8E1616]">{clamped}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden border border-[#000000]/30 bg-[#F8EEDF] ${
          size === 'sm' ? 'h-2' : 'h-3'
        }`}
      >
        <div
          className="h-full bg-[#8E1616] transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
