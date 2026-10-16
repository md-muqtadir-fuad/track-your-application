import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { calculateDueReminders, type RemindableItem, type ReminderLogEntry } from './index';

describe('Reminder Engine (SPEC Section 7 & 10)', () => {
  const sampleItems: RemindableItem[] = [
    {
      key: 'milestone:ucb',
      title: 'UC Berkeley CS PhD Application Deadline',
      dueLocal: '2026-12-15T20:59',
      tz: 'America/Los_Angeles',
      category: 'deadline',
    },
    {
      key: 'letter:mit:prof_turing',
      title: 'Letter request for Prof. Turing (MIT EECS)',
      dueLocal: '2026-12-01T23:59',
      tz: 'America/New_York',
      category: 'letter',
    },
  ];

  it('fires reminder when item is within lead time threshold and not yet logged', () => {
    // 6 days before UCB deadline (due Dec 15 20:59 PT -> Dec 16 04:59 UTC)
    // now = Dec 10 04:59 UTC
    const now = DateTime.fromISO('2026-12-10T04:59:00Z');
    const due = calculateDueReminders(now, sampleItems);

    const ucbReminder = due.find((r) => r.itemKey === 'milestone:ucb');
    expect(ucbReminder).toBeDefined();
    expect(ucbReminder?.leadDays).toBe(7);
    expect(ucbReminder?.daysRemaining).toBe(6);
  });

  it('respects no-repeat rule: does not repeat reminder once recorded in log', () => {
    const now = DateTime.fromISO('2026-12-10T04:59:00Z');
    const logs: ReminderLogEntry[] = [
      {
        itemKey: 'milestone:ucb',
        leadDays: 7,
        shownAt: '2026-12-09T10:00:00Z',
        snoozedUntil: null,
      },
    ];

    const due = calculateDueReminders(now, sampleItems, undefined, logs);
    const ucbReminder = due.find((r) => r.itemKey === 'milestone:ucb');
    expect(ucbReminder).toBeUndefined(); // Already shown, must not repeat
  });

  it('respects snooze: suppresses reminder until snoozedUntil expires', () => {
    const logs: ReminderLogEntry[] = [
      {
        itemKey: 'milestone:ucb',
        leadDays: 7,
        shownAt: '2026-12-09T10:00:00Z',
        snoozedUntil: '2026-12-12T12:00:00Z', // snoozed until Dec 12
      },
    ];

    // While before snooze expiration
    const beforeExpiry = DateTime.fromISO('2026-12-11T00:00:00Z');
    const dueBefore = calculateDueReminders(beforeExpiry, sampleItems, undefined, logs);
    expect(dueBefore.find((r) => r.itemKey === 'milestone:ucb')).toBeUndefined();

    // After snooze expiration
    const afterExpiry = DateTime.fromISO('2026-12-13T00:00:00Z');
    const dueAfter = calculateDueReminders(afterExpiry, sampleItems, undefined, logs);
    const ucbReminderAfter = dueAfter.find((r) => r.itemKey === 'milestone:ucb');
    expect(ucbReminderAfter).toBeDefined();
    expect(ucbReminderAfter?.itemKey).toBe('milestone:ucb');
  });
});
