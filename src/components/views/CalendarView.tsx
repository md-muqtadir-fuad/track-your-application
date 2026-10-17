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
        return 'bg-[#8E1616] text-[#F8EEDF] border-[#8E1616]';
      case 'priority':
        return 'bg-[#E8C999] text-[#000000] border-[#000000]/40 font-bold';
      case 'fee_waiver':
        return 'bg-[#E8C999]/60 text-[#000000] border-[#E8C999]';
      case 'letters':
        return 'bg-[#000000] text-[#F8EEDF] border-[#000000]';
      case 'followup':
        return 'bg-[#F8EEDF] text-[#8E1616] border-[#8E1616] font-semibold';
      default:
        return 'bg-[#E8C999]/30 text-[#000000] border-[#000000]/20';
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
              className="border border-[#000000]/25 bg-[#F8EEDF] p-1.5 text-[#000000] hover:bg-[#E8C999]/40"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(DateTime.local().startOf('month'))}
              className="border border-[#000000]/25 bg-[#F8EEDF] px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#000000] hover:bg-[#E8C999]/40"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => m.plus({ months: 1 }))}
              className="border border-[#000000]/25 bg-[#F8EEDF] p-1.5 text-[#000000] hover:bg-[#E8C999]/40"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h3 className="font-serif text-lg font-bold text-[#000000]">
            {currentMonth.toFormat('MMMM yyyy')}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex border border-[#000000]/25 bg-[#F8EEDF] p-0.5 text-xs font-mono uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                viewMode === 'month'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              Agenda
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 border border-[#000000]/25 bg-[#F8EEDF] px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#000000] hover:bg-[#E8C999]/40"
          >
            <Download className="h-3.5 w-3.5 text-[#8E1616]" />
            Export .ics Calendar
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' && (
        <div className="overflow-hidden border border-[#000000]/25 bg-white shadow-xs">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b-2 border-[#000000] bg-[#E8C999]/35 text-center text-xs font-serif font-bold text-[#000000]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#000000]/15 bg-white">
            {/* Leading empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[105px] bg-[#F8EEDF]/40" />
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
                    isToday ? 'bg-[#E8C999]/30' : 'bg-white hover:bg-[#E8C999]/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        isToday ? 'bg-[#8E1616] px-1.5 py-0.5 text-[#F8EEDF]' : 'text-[#000000]'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="font-mono text-[10px] text-[#000000]/50 font-bold">
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
                        className={`truncate border px-1.5 py-0.5 text-[10px] font-mono leading-tight cursor-pointer ${eventColor(
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
        <div className="border border-[#000000]/25 bg-white shadow-xs divide-y divide-[#000000]/10">
          {calendarEvents.length === 0 ? (
            <div className="p-8 text-center text-xs font-serif italic text-[#000000]/50">
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
                  className={`flex items-center justify-between p-4 text-xs hover:bg-[#E8C999]/20 transition-colors ${
                    evt.applicationId ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="border border-[#000000]/20 bg-[#F8EEDF] px-2.5 py-1.5 text-center font-mono">
                      <span className="block text-[10px] text-[#000000]/60">
                        {evt.dueLocal.slice(0, 4)}
                      </span>
                      <span className="block text-sm font-bold text-[#8E1616]">
                        {evt.dueLocal.slice(5, 10)}
                      </span>
                    </div>

                    <div>
                      <span className="font-serif font-bold text-[#000000] text-sm">
                        {evt.institution}
                      </span>
                      <p className="text-[#000000]/80 mt-0.5 font-mono text-xs">{evt.title}</p>
                      <p className="font-mono text-[11px] text-[#000000]/50 mt-0.5">
                        {evt.dueLocal.replace('T', ' ')} ({evt.tz})
                      </p>
                    </div>
                  </div>

                  <span
                    className={`border px-2.5 py-1 text-xs font-mono font-bold uppercase ${eventColor(evt.kind)}`}
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
