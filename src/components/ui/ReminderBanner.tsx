import React, { useState, useEffect, useCallback } from 'react';
import { BellRing, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { useDatabase } from '../../lib/db/context';
import { calculateDueReminders, type RemindableItem, type DueReminder } from '../../lib/reminders';

export const ReminderBanner: React.FC = () => {
  const { repos, version } = useDatabase();
  const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkReminders = useCallback(async () => {
    if (!repos) return;

    const [milestones, contacts, logs, leadsSetting] = await Promise.all([
      repos.milestones.listAll(),
      repos.contacts.list('faculty'),
      repos.reminderLogs.list(),
      repos.settings.get('reminder_lead_days', '30,14,7,3,1'),
    ]);

    const leadDays = leadsSetting
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const remindableItems: RemindableItem[] = [];

    // 1. Milestones
    for (const m of milestones) {
      if (!m.deleted_at && !m.done_at) {
        remindableItems.push({
          key: `milestone:${m.id}`,
          title: m.label,
          dueLocal: m.due_local,
          tz: m.tz,
          category: 'deadline',
        });
      }
    }

    // 2. Faculty follow-ups
    for (const f of contacts) {
      if (!f.deleted_at && f.next_follow_up_on) {
        remindableItems.push({
          key: `faculty:${f.id}`,
          title: `Follow up with ${f.name}`,
          dueLocal: f.next_follow_up_on.slice(0, 16),
          tz: 'UTC',
          category: 'follow_up',
        });
      }
    }

    const logEntries = logs.map((l) => ({
      itemKey: l.item_key,
      leadDays: l.lead_days,
      shownAt: l.shown_at,
      snoozedUntil: l.snoozed_until,
    }));

    const due = calculateDueReminders(DateTime.now(), remindableItems, leadDays, logEntries);
    setDueReminders(due);
  }, [repos]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 15 * 60 * 1000); // 15 mins per SPEC
    return () => clearInterval(interval);
  }, [checkReminders, version]);

  if (dueReminders.length === 0 || isDismissed) return null;

  const current = dueReminders[0]!;

  const handleSnooze = async (days: number) => {
    if (!repos) return;
    const snoozedUntil = DateTime.now().plus({ days }).toISO()!;
    await repos.reminderLogs.snooze(current.itemKey, snoozedUntil);
    checkReminders();
  };

  const handleAcknowledge = async () => {
    if (!repos) return;
    await repos.reminderLogs.recordShown(current.itemKey, current.leadDays);
    checkReminders();
  };

  return (
    <div className="bg-[#8E1616] px-4 py-2 text-xs text-[#F8EEDF] border-b border-[#000000]/20 flex items-center justify-between gap-3 font-mono">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-[#E8C999] animate-pulse shrink-0" />
        <span className="font-bold tracking-wider uppercase text-[#E8C999]">NOTICE:</span>
        <span className="font-sans text-xs">
          {current.title} is due in{' '}
          <strong className="underline text-[#E8C999]">
            {current.daysRemaining <= 0 ? 'today / overdue' : `${current.daysRemaining} days`}
          </strong>{' '}
          ({current.dueLocal.replace('T', ' ')}).
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => handleSnooze(1)}
          className="border border-[#F8EEDF]/30 bg-[#6d1010] hover:bg-[#000000] text-[#F8EEDF] px-2 py-0.5 text-[10px] font-mono"
        >
          Snooze 1d
        </button>
        <button
          type="button"
          onClick={() => handleSnooze(3)}
          className="border border-[#F8EEDF]/30 bg-[#6d1010] hover:bg-[#000000] text-[#F8EEDF] px-2 py-0.5 text-[10px] font-mono"
        >
          Snooze 3d
        </button>
        <button
          type="button"
          onClick={handleAcknowledge}
          className="border border-[#E8C999] bg-[#E8C999] text-[#000000] hover:bg-white px-2 py-0.5 text-[10px] font-bold font-mono"
        >
          Acknowledge
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-[#6d1010] text-[#F8EEDF]"
          aria-label="Close reminder bar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
