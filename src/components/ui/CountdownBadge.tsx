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
    }, 30000); // update every 30s
    return () => clearInterval(timer);
  }, [dueLocal, schoolTz]);

  const dual = formatDualTime(dueLocal, schoolTz, userTz);
  const isUrgent = !countdown.isPast && countdown.days < 2;

  if (compact) {
    return (
      <div className="flex flex-col text-xs font-mono">
        <span
          className={`font-semibold ${
            countdown.isPast
              ? 'text-slate-400 dark:text-slate-500'
              : isUrgent
                ? 'text-red-600 dark:text-red-400 font-bold'
                : 'text-slate-800 dark:text-slate-200'
          }`}
        >
          {countdown.isPast ? 'Passed' : countdown.formatted}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {dual.schoolTime} {dual.schoolZoneAbbr} ({dual.userTime} {dual.userZoneAbbr})
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border p-2.5 transition-colors ${
        countdown.isPast
          ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60'
          : isUrgent
            ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800/80 dark:bg-red-950/40 dark:text-red-200'
            : 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight">
          <Clock
            className={`h-4 w-4 ${isUrgent ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-slate-500'}`}
          />
          <span>{countdown.isPast ? 'Deadline passed' : `${countdown.formatted} remaining`}</span>
        </div>
        {timeAssumed && (
          <span
            title="Time assumed at 23:59. Check the program page."
            className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
          >
            <AlertTriangle className="h-3 w-3" />
            Time assumed
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-xs text-slate-600 dark:text-slate-400">
        <div>
          <span className="text-slate-400 dark:text-slate-500">School: </span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {dual.schoolTime} {dual.schoolZoneAbbr}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500">My time: </span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {dual.userTime} {dual.userZoneAbbr}
          </span>
        </div>
      </div>
    </div>
  );
};
