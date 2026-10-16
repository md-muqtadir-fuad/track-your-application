import { DateTime } from 'luxon';

export interface PinnedTimeZone {
  label: string;
  zone: string;
}

export const PINNED_US_TIMEZONES: readonly PinnedTimeZone[] = [
  { label: 'Eastern (ET)', zone: 'America/New_York' },
  { label: 'Central (CT)', zone: 'America/Chicago' },
  { label: 'Mountain (MT)', zone: 'America/Denver' },
  { label: 'Arizona (no DST)', zone: 'America/Phoenix' },
  { label: 'Pacific (PT)', zone: 'America/Los_Angeles' },
  { label: 'Alaska (AKT)', zone: 'America/Anchorage' },
  { label: 'Hawaii (HT)', zone: 'Pacific/Honolulu' },
];

export const DEFAULT_USER_TIMEZONE = 'Asia/Dhaka';

/**
 * Parses a wall-clock string (e.g. "2026-12-15T20:59") in a specific IANA time zone.
 * If ambiguous or non-existent due to DST transitions:
 * - Spring-forward gaps resolve forward to the newly advanced valid time.
 * - Fall-back duplicates resolve to the earlier standard occurrence.
 */
export function parseWallClock(dueLocal: string, tz: string): DateTime {
  const dt = DateTime.fromISO(dueLocal, { zone: tz });
  if (!dt.isValid) {
    throw new Error(
      `Invalid local date/time "${dueLocal}" or time zone "${tz}": ${dt.invalidReason}`,
    );
  }
  return dt;
}

/**
 * Converts a school wall-clock time to ISO 8601 UTC string.
 */
export function toUTC(dueLocal: string, tz: string): string {
  const dt = parseWallClock(dueLocal, tz);
  return dt.toUTC().toISO({ suppressMilliseconds: true }) ?? dt.toUTC().toISO()!;
}

/**
 * Converts a school wall-clock time into the applicant's time zone.
 */
export function toTargetZone(dueLocal: string, sourceTz: string, targetTz: string): DateTime {
  const sourceDt = parseWallClock(dueLocal, sourceTz);
  return sourceDt.setZone(targetTz);
}

/**
 * Formats a deadline for both school and user time zones.
 */
export function formatDualTime(
  dueLocal: string,
  sourceTz: string,
  userTz: string,
  format = 'yyyy-MM-dd HH:mm',
): { schoolTime: string; userTime: string; schoolZoneAbbr: string; userZoneAbbr: string } {
  const schoolDt = parseWallClock(dueLocal, sourceTz);
  const userDt = schoolDt.setZone(userTz);

  return {
    schoolTime: schoolDt.toFormat(format),
    userTime: userDt.toFormat(format),
    schoolZoneAbbr: schoolDt.offsetNameShort ?? sourceTz,
    userZoneAbbr: userDt.offsetNameShort ?? userTz,
  };
}

export interface CountdownResult {
  totalMinutes: number;
  days: number;
  hours: number;
  minutes: number;
  isOverdue: boolean;
  formatted: string;
}

/**
 * Computes exact countdown from reference `now` (defaulting to current wall clock) to deadline.
 */
export function calculateCountdown(
  dueLocal: string,
  sourceTz: string,
  nowReference?: DateTime,
): CountdownResult {
  const deadlineUtc = parseWallClock(dueLocal, sourceTz).toUTC();
  const nowUtc = (nowReference ?? DateTime.now()).toUTC();

  const diff = deadlineUtc.diff(nowUtc, ['days', 'hours', 'minutes']);
  const totalMinutes = Math.floor(deadlineUtc.diff(nowUtc, 'minutes').minutes);

  const isOverdue = totalMinutes < 0;
  const absDiff = isOverdue ? nowUtc.diff(deadlineUtc, ['days', 'hours', 'minutes']) : diff;

  const days = Math.floor(absDiff.days);
  const hours = Math.floor(absDiff.hours);
  const minutes = Math.floor(absDiff.minutes);

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${minutes}m`;
  }

  if (isOverdue) {
    formatted = `${formatted} overdue`;
  }

  return {
    totalMinutes,
    days,
    hours,
    minutes,
    isOverdue,
    formatted,
  };
}

/**
 * If only a date (YYYY-MM-DD) is supplied, default to 23:59 school time and flag as assumed.
 */
export function normalizeDeadlineInput(input: string): { dueLocal: string; timeAssumed: boolean } {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return {
      dueLocal: `${trimmed}T23:59`,
      timeAssumed: true,
    };
  }
  return {
    dueLocal: trimmed,
    timeAssumed: false,
  };
}
