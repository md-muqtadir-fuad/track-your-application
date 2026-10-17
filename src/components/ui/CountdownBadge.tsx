import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatDualTime, getCountdown } from '../../lib/time';

interface CountdownBadgeProps {
  dueLocal: string;
  schoolTz: string;
  userTz: string;
  timeAssumed?: boolean;
  compact?: boolean;
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({
  dueLocal,
  schoolTz,
  userTz,
  timeAssumed = false,
  compact = false,
}) => {
  const [countdown, setCountdown] = useState(() => getCountdown(dueLocal, schoolTz));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown(dueLocal, schoolTz));
    }, 30000);
    return () => clearInterval(timer);
  }, [dueLocal, schoolTz]);

  const dual = formatDualTime(dueLocal, schoolTz, userTz);
  const isUrgent = !countdown.isPast && countdown.days < 2;

  if (compact) {
    return (
      <div className="flex flex-col text-xs font-mono">
        <span
          className={`font-bold tracking-tight ${
            countdown.isPast ? 'text-[#000000]/40' : isUrgent ? 'text-[#8E1616]' : 'text-[#000000]'
          }`}
        >
          {countdown.isPast ? 'Passed' : countdown.formatted}
        </span>
        <span className="text-[10px] text-[#000000]/60">
          {dual.schoolTime} {dual.schoolZoneAbbr} ({dual.userTime} {dual.userZoneAbbr})
        </span>
      </div>
    );
  }

  return (
    <div
      className={`border p-2.5 transition-colors ${
        countdown.isPast
          ? 'border-[#000000]/15 bg-[#F8EEDF] text-[#000000]/50'
          : isUrgent
            ? 'border-[#8E1616] bg-[#F8EEDF] text-[#8E1616]'
            : 'border-[#000000]/20 bg-white text-[#000000]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
          <Clock
            className={`h-3.5 w-3.5 ${isUrgent ? 'text-[#8E1616] animate-pulse' : 'text-[#8E1616]'}`}
          />
          <span className={isUrgent ? 'text-[#8E1616]' : 'text-[#000000]'}>
            {countdown.isPast ? 'DEADLINE PASSED' : `T - ${countdown.formatted}`}
          </span>
        </div>
        {timeAssumed && (
          <span
            title="Time assumed at 23:59. Check the program page."
            className="inline-flex items-center gap-1 border border-[#E8C999] bg-[#E8C999]/30 px-1.5 py-0.2 text-[9px] font-mono font-medium text-[#000000]"
          >
            <AlertTriangle className="h-2.5 w-2.5 text-[#8E1616]" />
            ESTIMATED
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11px] text-[#000000]/70">
        <div>
          <span className="text-[#000000]/40">INSTITUTION: </span>
          <span className="font-semibold text-[#000000]">
            {dual.schoolTime} {dual.schoolZoneAbbr}
          </span>
        </div>
        <div>
          <span className="text-[#000000]/40">LOCAL: </span>
          <span className="font-semibold text-[#000000]">
            {dual.userTime} {dual.userZoneAbbr}
          </span>
        </div>
      </div>
    </div>
  );
};
