import React from 'react';
import {
  Compass,
  Pencil,
  CheckCircle2,
  Users,
  Award,
  Clock,
  CheckCheck,
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
    label: 'EXPLORING',
    bg: 'bg-[#E8C999]/30',
    text: 'text-[#000000]',
    border: 'border-[#E8C999]',
    icon: Compass,
  },
  Applying: {
    label: 'DRAFTING',
    bg: 'bg-[#F8EEDF]',
    text: 'text-[#8E1616]',
    border: 'border-[#8E1616]',
    icon: Pencil,
  },
  Submitted: {
    label: 'SUBMITTED',
    bg: 'bg-[#8E1616]',
    text: 'text-[#F8EEDF]',
    border: 'border-[#8E1616]',
    icon: CheckCircle2,
  },
  Interviewing: {
    label: 'INTERVIEW',
    bg: 'bg-[#E8C999]',
    text: 'text-[#000000]',
    border: 'border-[#8E1616]',
    icon: Users,
  },
  Admitted: {
    label: 'ADMITTED',
    bg: 'bg-[#8E1616]',
    text: 'text-[#E8C999]',
    border: 'border-[#E8C999]',
    icon: Award,
  },
  Waitlisted: {
    label: 'WAITLIST',
    bg: 'bg-[#F8EEDF]',
    text: 'text-[#000000]',
    border: 'border-[#E8C999]',
    icon: Clock,
  },
  Accepted: {
    label: 'ACCEPTED',
    bg: 'bg-[#000000]',
    text: 'text-[#E8C999]',
    border: 'border-[#8E1616]',
    icon: CheckCheck,
  },
  Declined: {
    label: 'DECLINED',
    bg: 'bg-[#F8EEDF]',
    text: 'text-[#8E1616]/80',
    border: 'border-[#000000]/20',
    icon: XCircle,
  },
  Withdrawn: {
    label: 'WITHDRAWN',
    bg: 'bg-[#F8EEDF]',
    text: 'text-[#000000]/60',
    border: 'border-[#000000]/20',
    icon: MinusCircle,
  },
  Rejected: {
    label: 'REJECTED',
    bg: 'bg-[#F8EEDF]',
    text: 'text-[#000000]/70',
    border: 'border-[#000000]/30',
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
      className={`inline-flex items-center gap-1.5 rounded-none border font-mono tracking-wider font-semibold ${config.bg} ${config.text} ${config.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${
        isInteractive
          ? 'cursor-pointer transition-opacity hover:opacity-85 focus:outline-none focus:ring-1 focus:ring-[#8E1616]'
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
