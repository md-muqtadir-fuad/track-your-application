import { describe, it, expect } from 'vitest';
import { generateIcs, type CalendarEventItem } from './ics-export';

describe('iCalendar RFC 5545 (.ics) export', () => {
  const sampleEvents: CalendarEventItem[] = [
    {
      id: 'event-1',
      title: 'PhD Application Deadline',
      institution: 'UC Berkeley',
      dueLocal: '2026-12-15T20:59',
      tz: 'America/Los_Angeles',
      kind: 'application',
      userTz: 'Asia/Dhaka',
      notes: 'IEOR Department requires all letters by 8:59 PM PT',
    },
    {
      id: 'event-2',
      title: 'Fee Waiver Request Deadline',
      institution: 'NC State University',
      dueLocal: '2026-12-01T23:59',
      tz: 'America/New_York',
      kind: 'fee_waiver',
      userTz: 'Asia/Dhaka',
    },
  ];

  it('generates compliant VCALENDAR header and footer', () => {
    const ics = generateIcs(sampleEvents);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Track Your PhD Application//EN');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('correctly converts wall clock deadline to UTC DTSTART string', () => {
    const ics = generateIcs(sampleEvents);
    // 2026-12-15 20:59 Pacific is 2026-12-16 04:59 UTC
    expect(ics).toContain('DTSTART:20261216T045900Z');
    expect(ics).toContain('SUMMARY:[UC Berkeley] PhD Application Deadline');
    expect(ics).toContain('UID:event-1@trackyourphdapplication');
  });

  it('includes VALARMs for lead reminder days', () => {
    const ics = generateIcs(sampleEvents, [14, 7, 1]);
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-P14D');
    expect(ics).toContain('TRIGGER:-P7D');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('ACTION:DISPLAY');
  });
});
