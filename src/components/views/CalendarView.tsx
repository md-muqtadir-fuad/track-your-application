import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, ListFilter, Grid } from 'lucide-react';
import { DateTime } from 'luxon';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { generateIcs, downloadIcs, type CalendarEventItem } from '../../lib/calendar/ics-export';
import type { Application, University, Milestone, Contact } from '../../lib/db/schema';

export const CalendarView: React.FC<{
  onSelectApplication?: (id: string) => void;
}> = ({ onSelectApplication }) => {
  const { repos, userTz, version } = useDatabase();
  const { showToast } = useToast();

  const [currentMonth, setCurrentMonth] = useState<DateTime>(DateTime.local().startOf('month'));
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  const [applications, setApplications] = useState<Application[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [apps, unis, ms, allContacts] = await Promise.all([
      repos.applications.list(),
      repos.universities.list(),
      repos.milestones.listAll(),
      repos.contacts.list(),
    ]);
    setApplications(apps);
    setUniversities(unis);
    setMilestones(ms);
    setContacts(allContacts);
  }, [repos]);

  useEffect(() => {
    loadData();
  }, [loadData, version]);

  const uniMap = useMemo(() => {
    const map = new Map<string, University>();
    for (const u of universities) {
      map.set(u.id, u);
    }
    return map;
  }, [universities]);

  const appMap = useMemo(() => {
    const map = new Map<string, Application>();
    for (const a of applications) {
      map.set(a.id, a);
    }
    return map;
  }, [applications]);

  // Aggregate all dated items
  const calendarEvents = useMemo(() => {
    const events: Array<CalendarEventItem & { dateKey: string; applicationId?: string }> = [];

    // 1. Milestones (deadlines)
    for (const m of milestones) {
      const app = appMap.get(m.application_id);
      if (!app) continue;
      const uni = uniMap.get(app.university_id);
      const dateKey = m.due_local.slice(0, 10);

      events.push({
        id: `milestone-${m.id}`,
        applicationId: m.application_id,
        title: `${m.label} (${app.program})`,
        institution: uni?.name ?? 'University',
        dueLocal: m.due_local,
        tz: m.tz,
        kind: m.kind,
        userTz,
        notes: m.notes,
        dateKey,
      });
    }

    // 2. Faculty follow-up dates
    for (const f of contacts.filter((c) => c.kind === 'faculty')) {
      if (f.next_follow_up_on) {
        const uni = f.university_id ? uniMap.get(f.university_id) : null;
        const dateKey = f.next_follow_up_on.slice(0, 10);
        events.push({
          id: `followup-${f.id}`,
          title: `Follow up: ${f.name}`,
          institution: uni?.name ?? 'Faculty Contact',
          dueLocal: f.next_follow_up_on.slice(0, 16),
          tz: userTz,
          kind: 'followup',
          userTz,
          notes: f.notes,
          dateKey,
        });
      }
    }

    return events;
  }, [milestones, contacts, appMap, uniMap, userTz]);

  const handleExportIcs = () => {
    if (calendarEvents.length === 0) {
      showToast({ message: 'No dated calendar items to export.' });
      return;
    }
    const icsString = generateIcs(calendarEvents);
    downloadIcs('phd_application_deadlines.ics', icsString);
    showToast({
      message: 'Exported phd_application_deadlines.ics. Ready to import to Apple/Google Calendar.',
    });
  };

  // Month Grid Calculations
  const startDay = currentMonth.startOf('month');
  const daysInMonth = currentMonth.daysInMonth ?? 30;
  // Sunday = 7 in Luxon, map Sunday to 0
  const firstDayOfWeek = startDay.weekday % 7;

  const eventColor = (kind: string) => {
    switch (kind) {
      case 'application':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      case 'priority':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800';
      case 'fee_waiver':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'letters':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      case 'followup':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => m.minus({ months: 1 }))}
              className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(DateTime.local().startOf('month'))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => m.plus({ months: 1 }))}
              className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {currentMonth.toFormat('MMMM yyyy')}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              Agenda
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export .ics Calendar
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {/* Leading empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[105px] bg-slate-50/40 dark:bg-slate-950/20"
              />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = currentMonth.set({ day: dayNum }).toFormat('yyyy-MM-dd');
              const isToday = dateStr === DateTime.local().toFormat('yyyy-MM-dd');
              const dayEvents = calendarEvents.filter((e) => e.dateKey === dateStr);

              return (
                <div
                  key={dateStr}
                  className={`min-h-[105px] p-2 transition-colors ${
                    isToday ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        isToday
                          ? 'rounded-full bg-blue-600 px-1.5 py-0.5 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="font-mono text-[10px] text-slate-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[85px]">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        title={`${evt.institution} - ${evt.title} (${evt.dueLocal})`}
                        onClick={() => {
                          if (evt.applicationId && onSelectApplication) {
                            onSelectApplication(evt.applicationId);
                          }
                        }}
                        className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight cursor-pointer ${eventColor(
                          evt.kind,
                        )}`}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda / List View */}
      {viewMode === 'agenda' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {calendarEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No dated events or deadlines found.
            </div>
          ) : (
            calendarEvents
              .sort((a, b) => a.dueLocal.localeCompare(b.dueLocal))
              .map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => {
                    if (evt.applicationId && onSelectApplication) {
                      onSelectApplication(evt.applicationId);
                    }
                  }}
                  className={`flex items-center justify-between p-4 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    evt.applicationId ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-center font-mono dark:bg-slate-800">
                      <span className="block text-[10px] text-slate-400">
                        {evt.dueLocal.slice(0, 4)}
                      </span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        {evt.dueLocal.slice(5, 10)}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {evt.institution}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{evt.title}</p>
                      <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {evt.dueLocal.replace('T', ' ')} ({evt.tz})
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${eventColor(evt.kind)}`}
                  >
                    {evt.kind.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};
