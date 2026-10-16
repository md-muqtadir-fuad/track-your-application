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
    <div className="bg-blue-600 px-4 py-2 text-xs text-white shadow-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 animate-pulse shrink-0" />
        <span className="font-semibold">Reminder:</span>
        <span>
          {current.title} is due in{' '}
          <strong className="underline">
            {current.daysRemaining <= 0 ? 'today / overdue' : `${current.daysRemaining} days`}
          </strong>{' '}
          ({current.dueLocal.replace('T', ' ')}).
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => handleSnooze(1)}
          className="rounded bg-blue-700 hover:bg-blue-800 px-2 py-0.5 text-[11px] font-medium"
        >
          Snooze 1d
        </button>
        <button
          type="button"
          onClick={() => handleSnooze(3)}
          className="rounded bg-blue-700 hover:bg-blue-800 px-2 py-0.5 text-[11px] font-medium"
        >
          Snooze 3d
        </button>
        <button
          type="button"
          onClick={handleAcknowledge}
          className="rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[11px] font-medium"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-blue-700 rounded"
          aria-label="Close reminder bar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
