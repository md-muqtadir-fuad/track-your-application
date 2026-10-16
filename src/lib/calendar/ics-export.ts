import { DateTime } from 'luxon';
import { parseWallClock } from '../time';

export interface CalendarEventItem {
  id: string;
  title: string;
  institution: string;
  dueLocal: string; // YYYY-MM-DDTHH:mm
  tz: string;
  kind: string;
  userTz?: string;
  notes?: string;
}

/**
 * Folds lines according to RFC 5545 (maximum 75 octets per line).
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let current = line.slice(0, 75);
  parts.push(current);
  let remaining = line.slice(75);
  while (remaining.length > 0) {
    current = ' ' + remaining.slice(0, 74);
    parts.push(current);
    remaining = remaining.slice(74);
  }
  return parts.join('\r\n');
}

/**
 * Formats a DateTime object as RFC 5545 UTC timestamp (e.g. "20261215T205900Z").
 */
function toIcsUtc(dt: DateTime): string {
  const utc = dt.toUTC();
  return utc.toFormat("yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Generates an RFC 5545 compliant .ics calendar string.
 */
export function generateIcs(
  events: CalendarEventItem[],
  leadDays: number[] = [30, 14, 7, 3, 1],
): string {
  const nowUtc = DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Track Your PhD Application//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:PhD Application Deadlines',
  ];

  for (const event of events) {
    try {
      const dtStart = parseWallClock(event.dueLocal, event.tz);
      const dtEnd = dtStart.plus({ hours: 1 });
      const dtStartUtc = toIcsUtc(dtStart);
      const dtEndUtc = toIcsUtc(dtEnd);

      const description = [
        `Institution: ${event.institution}`,
        `School local time: ${event.dueLocal.replace('T', ' ')} (${event.tz})`,
        event.userTz
          ? `My local time: ${dtStart.setZone(event.userTz).toFormat('yyyy-MM-dd HH:mm')} (${event.userTz})`
          : '',
        event.notes ? `Notes: ${event.notes}` : '',
      ]
        .filter(Boolean)
        .join('\\n');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@trackyourphdapplication`);
      lines.push(`DTSTAMP:${nowUtc}`);
      lines.push(`DTSTART:${dtStartUtc}`);
      lines.push(`DTEND:${dtEndUtc}`);
      lines.push(`SUMMARY:[${event.institution}] ${event.title}`);
      lines.push(`DESCRIPTION:${description}`);

      // Add VALARMs for specified lead days
      for (const lead of leadDays) {
        lines.push('BEGIN:VALARM');
        lines.push(`TRIGGER:-P${lead}D`);
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Reminder: ${event.title} is due in ${lead} day(s)`);
        lines.push('END:VALARM');
      }

      lines.push('END:VEVENT');
    } catch (err) {
      console.warn(`Skipping event ${event.id} during .ics generation:`, err);
    }
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Initiates download of .ics calendar file in the webview / browser.
 */
export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
