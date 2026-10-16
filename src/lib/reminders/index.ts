import { DateTime } from 'luxon';
import { parseWallClock } from '../time';

export interface RemindableItem {
  key: string;
  title: string;
  dueLocal: string;
  tz: string;
  category: 'deadline' | 'letter' | 'scores' | 'waiver' | 'follow_up' | 'other';
  notes?: string;
}

export interface ReminderLogEntry {
  itemKey: string;
  leadDays: number;
  shownAt: string;
  snoozedUntil?: string | null;
}

export interface DueReminder {
  itemKey: string;
  leadDays: number;
  title: string;
  category: string;
  dueLocal: string;
  tz: string;
  daysRemaining: number;
  isOverdue: boolean;
}

export const DEFAULT_LEAD_TIMES = [30, 14, 7, 3, 1];

/**
 * Pure function: (now, items, leadTimes, reminderLog) -> dueReminders
 * Evaluates which deadlines/items should trigger an alert.
 * Respects no-repeat rule (never repeats a shown reminder) and snooze.
 */
export function calculateDueReminders(
  now: DateTime,
  items: readonly RemindableItem[],
  leadTimes: readonly number[] = DEFAULT_LEAD_TIMES,
  reminderLogs: readonly ReminderLogEntry[] = [],
): DueReminder[] {
  const due: DueReminder[] = [];
  // Sort ascending: [1, 3, 7, 14, 30] so the closest applicable threshold matches first
  const sortedLeadTimes = [...leadTimes].sort((a, b) => a - b);

  for (const item of items) {
    const dueUtc = parseWallClock(item.dueLocal, item.tz).toUTC();
    const nowUtc = now.toUTC();

    const diff = dueUtc.diff(nowUtc, 'days');
    const daysRemaining = Math.floor(diff.days);

    // If already overdue by more than 14 days, don't trigger regular upcoming alerts
    if (daysRemaining < -14) {
      continue;
    }

    // Find the closest upcoming lead threshold (e.g. if 6 days remain, closest is 7)
    for (const lead of sortedLeadTimes) {
      if (daysRemaining <= lead) {
        const log = reminderLogs.find(
          (entry) => entry.itemKey === item.key && entry.leadDays === lead,
        );

        if (log) {
          // If snoozed, check if snooze expired
          if (log.snoozedUntil) {
            const snoozedUntilDt = DateTime.fromISO(log.snoozedUntil).toUTC();
            if (nowUtc >= snoozedUntilDt) {
              // Snooze expired: fire reminder again
              due.push({
                itemKey: item.key,
                leadDays: lead,
                title: item.title,
                category: item.category,
                dueLocal: item.dueLocal,
                tz: item.tz,
                daysRemaining,
                isOverdue: daysRemaining < 0,
              });
              break;
            }
          }
          // Already shown and not active snooze -> do not repeat
          break;
        }

        // Not yet shown for this threshold -> fire!
        due.push({
          itemKey: item.key,
          leadDays: lead,
          title: item.title,
          category: item.category,
          dueLocal: item.dueLocal,
          tz: item.tz,
          daysRemaining,
          isOverdue: daysRemaining < 0,
        });
        break;
      }
    }
  }

  return due;
}
