import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  parseWallClock,
  toUTC,
  toTargetZone,
  formatDualTime,
  calculateCountdown,
  normalizeDeadlineInput,
} from './index';

describe('Time utilities and Time-Zone conversions (SPEC Section 10)', () => {
  const DHAKA = 'Asia/Dhaka';

  it('converts UC Berkeley deadline: 2026-12-15 20:59 America/Los_Angeles -> 2026-12-16 04:59 UTC -> 2026-12-16 10:59 Dhaka', () => {
    const dueLocal = '2026-12-15T20:59';
    const zone = 'America/Los_Angeles';

    const utcIso = toUTC(dueLocal, zone);
    expect(utcIso).toBe('2026-12-16T04:59:00Z');

    const dhakaDt = toTargetZone(dueLocal, zone, DHAKA);
    expect(dhakaDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-12-16 10:59');
  });

  it('converts winter East Coast deadline: 2026-12-15 23:59 America/New_York -> 2026-12-16 04:59 UTC -> 2026-12-16 10:59 Dhaka', () => {
    const dueLocal = '2026-12-15T23:59';
    const zone = 'America/New_York';

    const utcIso = toUTC(dueLocal, zone);
    expect(utcIso).toBe('2026-12-16T04:59:00Z');

    const dhakaDt = toTargetZone(dueLocal, zone, DHAKA);
    expect(dhakaDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-12-16 10:59');
  });

  it('converts April 15 resolution deadline (EDT): 2027-04-15 23:59 America/New_York -> 2027-04-16 03:59 UTC -> 2027-04-16 09:59 Dhaka', () => {
    const dueLocal = '2027-04-15T23:59';
    const zone = 'America/New_York';

    const utcIso = toUTC(dueLocal, zone);
    expect(utcIso).toBe('2027-04-16T03:59:00Z');

    const dhakaDt = toTargetZone(dueLocal, zone, DHAKA);
    expect(dhakaDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2027-04-16 09:59');
  });

  it('verifies Arizona (no DST): 2026-12-01 23:59 America/Phoenix -> 2026-12-02 06:59 UTC and 2027-04-15 23:59 America/Phoenix -> 2027-04-16 06:59 UTC', () => {
    const phoenix = 'America/Phoenix';

    const winterUtc = toUTC('2026-12-01T23:59', phoenix);
    expect(winterUtc).toBe('2026-12-02T06:59:00Z');

    const springUtc = toUTC('2027-04-15T23:59', phoenix);
    expect(springUtc).toBe('2027-04-16T06:59:00Z');
  });

  it('resolves spring-forward gap and fall-back overlap transitions deterministically', () => {
    // US Spring forward in 2027 occurs on 2027-03-14 at 02:00 -> jumps to 03:00
    const springGap = parseWallClock('2027-03-14T02:30', 'America/New_York');
    expect(springGap.isValid).toBe(true);

    // US Fall back in 2027 occurs on 2027-11-07 at 02:00 -> falls back to 01:00
    const fallOverlap = parseWallClock('2027-11-07T01:30', 'America/New_York');
    expect(fallOverlap.isValid).toBe(true);
  });

  it('changing user time zone changes display formatting only, not stored wall-clock', () => {
    const dueLocal = '2026-12-15T23:59';
    const schoolTz = 'America/New_York';

    const inDhaka = formatDualTime(dueLocal, schoolTz, 'Asia/Dhaka');
    expect(inDhaka.schoolTime).toBe('2026-12-15 23:59');
    expect(inDhaka.userTime).toBe('2026-12-16 10:59');

    const inLondon = formatDualTime(dueLocal, schoolTz, 'Europe/London');
    expect(inLondon.schoolTime).toBe('2026-12-15 23:59');
    expect(inLondon.userTime).toBe('2026-12-16 04:59');
  });

  it('calculates countdowns accurately and handles overdue items', () => {
    const now = DateTime.fromISO('2026-12-01T00:00:00Z');
    const deadline = '2026-12-15T23:59'; // in America/New_York (UTC-5) -> 2026-12-16T04:59:00Z

    const countdown = calculateCountdown(deadline, 'America/New_York', now);
    expect(countdown.isOverdue).toBe(false);
    expect(countdown.days).toBe(15);
    expect(countdown.hours).toBe(4);
    expect(countdown.minutes).toBe(59);

    const pastNow = DateTime.fromISO('2026-12-20T00:00:00Z');
    const overdueCountdown = calculateCountdown(deadline, 'America/New_York', pastNow);
    expect(overdueCountdown.isOverdue).toBe(true);
    expect(overdueCountdown.formatted).toContain('overdue');
  });

  it('normalizes date-only input by defaulting to 23:59 school time with timeAssumed true', () => {
    const assumed = normalizeDeadlineInput('2026-12-15');
    expect(assumed).toEqual({
      dueLocal: '2026-12-15T23:59',
      timeAssumed: true,
    });

    const explicit = normalizeDeadlineInput('2026-12-15T20:59');
    expect(explicit).toEqual({
      dueLocal: '2026-12-15T20:59',
      timeAssumed: false,
    });
  });
});
