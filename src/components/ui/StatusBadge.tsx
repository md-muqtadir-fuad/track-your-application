import React from 'react';
import {
  Compass,
  Pencil,
  CheckCircle2,
  Users,
  Award,
  Clock,
  Sparkles,
  XCircle,
  MinusCircle,
  Ban,
} from 'lucide-react';
import type { ApplicationStatus } from '../../lib/db/schema';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; bg: string; text: string; border: string; icon: typeof Compass }
> = {
  Exploring: {
    label: 'Exploring',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    icon: Compass,
  },
  Applying: {
    label: 'Applying',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Pencil,
  },
  Submitted: {
    label: 'Submitted',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: CheckCircle2,
  },
  Interviewing: {
    label: 'Interviewing',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Users,
  },
  Admitted: {
    label: 'Admitted',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: Award,
  },
  Waitlisted: {
    label: 'Waitlisted',
    bg: 'bg-cyan-50 dark:bg-cyan-950/60',
    text: 'text-cyan-800 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    icon: Clock,
  },
  Accepted: {
    label: 'Accepted',
    bg: 'bg-green-50 dark:bg-green-950/60',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: Sparkles,
  },
  Declined: {
    label: 'Declined',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    icon: XCircle,
  },
  Withdrawn: {
    label: 'Withdrawn',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    icon: MinusCircle,
  },
  Rejected: {
    label: 'Rejected',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    icon: Ban,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  onClick,
  className = '',
}) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Exploring;
  const Icon = config.icon;
  const isInteractive = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bg} ${config.text} ${config.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${
        isInteractive
          ? 'cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500'
          : ''
      } ${className}`}
    >
      <Icon
        className={size === 'sm' ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </span>
  );
};
