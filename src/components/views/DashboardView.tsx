import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Sparkles,
  Plus,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { CountdownBadge } from '../ui/CountdownBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusBadge } from '../ui/StatusBadge';
import { isAtRisk, calculateReadiness } from '../../lib/services/application-service';
import { parseWallClock } from '../../lib/time';
import { hasUserData } from '../../lib/user/user-loader';
import type {
  Application,
  University,
  Milestone,
  ChecklistItem,
  LetterRequest,
  Contact,
  ApplicationStatus,
} from '../../lib/db/schema';

export const DashboardView: React.FC<{
  onNavigate: (tab: string, appId?: string) => void;
  onOpenQuickAdd?: () => void;
}> = ({ onNavigate, onOpenQuickAdd }) => {
  const { repos, userTz, version, refresh, loadUser, loadDemo } = useDatabase();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [letterRequests, setLetterRequests] = useState<LetterRequest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [apps, unis, ms, cl, lr, allContacts] = await Promise.all([
      repos.applications.list(),
      repos.universities.list(),
      repos.milestones.listAll(),
      repos.checklistItems.listAll(),
      repos.letterRequests.listAll(),
      repos.contacts.list(),
    ]);
    setApplications(apps);
    setUniversities(unis);
    setMilestones(ms);
    setChecklistItems(cl);
    setLetterRequests(lr);
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

  const now = DateTime.now();

  // 1. "Today" Actions (~10 next actionable items across deadlines, checklist, letters, follow-ups)
  const todayActions = useMemo(() => {
    interface ActionItem {
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      applicationId?: string;
      dueDate?: string;
      onDone: () => Promise<void>;
      onSnooze: (days: number) => Promise<void>;
    }

    const items: ActionItem[] = [];

    // Faculty follow-ups due
    for (const contact of contacts.filter((c) => c.kind === 'faculty')) {
      if (contact.next_follow_up_on) {
        const followUpDt = DateTime.fromISO(contact.next_follow_up_on);
        if (followUpDt.diff(now, 'days').days <= 14) {
          items.push({
            id: `followup-${contact.id}`,
            title: `Follow up with ${contact.name}`,
            subtitle: `${contact.title} • ${contact.affiliation}`,
            badge: 'Faculty Outreach',
            dueDate: contact.next_follow_up_on,
            onDone: async () => {
              if (!repos) return;
              await repos.contacts.update(contact.id, {
                next_follow_up_on: null,
                outreach_status: 'met',
              });
              showToast({ message: `Marked outreach with ${contact.name} complete.` });
              refresh();
            },
            onSnooze: async (days) => {
              if (!repos) return;
              const snoozed = DateTime.now().plus({ days }).toISO()!;
              await repos.contacts.update(contact.id, { next_follow_up_on: snoozed });
              showToast({ message: `Snoozed follow-up for ${days} days.` });
              refresh();
            },
          });
        }
      }
    }

    // Letters to chase
    for (const lr of letterRequests) {
      if (['asked', 'link_sent'].includes(lr.status)) {
        const app = appMap.get(lr.application_id);
        const contact = contacts.find((c) => c.id === lr.contact_id);
        if (app && contact) {
          const uni = uniMap.get(app.university_id);
          items.push({
            id: `letter-${lr.id}`,
            title: `Check letter from ${contact.name}`,
            subtitle: `${uni?.name} (${app.program})`,
            badge: 'Letter of Rec',
            applicationId: app.id,
            onDone: async () => {
              if (!repos) return;
              await repos.letterRequests.updateStatus(lr.id, 'submitted');
              showToast({ message: `Marked letter from ${contact.name} as submitted.` });
              refresh();
            },
            onSnooze: async (days) => {
              showToast({ message: `Snoozed reminder for ${days} days.` });
            },
          });
        }
      }
    }

    // Open required checklist items
    for (const item of checklistItems) {
      if (item.status === 'todo') {
        const app = appMap.get(item.application_id);
        if (app && !['Submitted', 'Admitted', 'Accepted'].includes(app.status)) {
          const uni = uniMap.get(app.university_id);
          items.push({
            id: `checklist-${item.id}`,
            title: item.label,
            subtitle: `${uni?.name} (${app.program})`,
            badge: 'Checklist',
            applicationId: app.id,
            onDone: async () => {
              if (!repos) return;
              await repos.checklistItems.update(item.id, { status: 'done' });
              showToast({ message: `Completed "${item.label}".` });
              refresh();
            },
            onSnooze: async (days) => {
              showToast({ message: `Snoozed task for ${days} days.` });
            },
          });
        }
      }
    }

    return items.slice(0, 10);
  }, [contacts, letterRequests, checklistItems, appMap, uniMap, repos, refresh, showToast, now]);

  // 2. Upcoming Deadlines (within next 60 days)
  const upcomingDeadlines = useMemo(() => {
    const list: Array<{
      application: Application;
      university: University;
      milestone: Milestone;
      diffDays: number;
    }> = [];

    for (const app of applications) {
      if (
        ['Submitted', 'Admitted', 'Accepted', 'Declined', 'Withdrawn', 'Rejected'].includes(
          app.status,
        )
      ) {
        continue;
      }
      const uni = uniMap.get(app.university_id);
      if (!uni) continue;

      const ms = milestones.find((m) => m.application_id === app.id && m.kind === 'application');
      if (ms) {
        const deadlineDt = parseWallClock(ms.due_local, ms.tz);
        const diff = deadlineDt.diff(now, 'days').days;
        if (diff >= -1 && diff <= 60) {
          list.push({ application: app, university: uni, milestone: ms, diffDays: diff });
        }
      }
    }

    return list.sort((a, b) => a.diffDays - b.diffDays);
  }, [applications, uniMap, milestones, now]);

  // 3. At-risk Applications
  const atRiskList = useMemo(() => {
    const list: Array<{
      application: Application;
      university: University;
      reasons: string[];
      readiness: number;
    }> = [];

    for (const app of applications) {
      const uni = uniMap.get(app.university_id);
      if (!uni) continue;
      const ms = milestones.find((m) => m.application_id === app.id && m.kind === 'application');
      const items = checklistItems.filter((i) => i.application_id === app.id);
      const letters = letterRequests.filter((l) => l.application_id === app.id);
      const readiness = calculateReadiness(items, letters);

      const risk = isAtRisk(app, ms, readiness, letters, now);
      if (risk.atRisk) {
        list.push({ application: app, university: uni, reasons: risk.reasons, readiness });
      }
    }

    return list;
  }, [applications, uniMap, milestones, checklistItems, letterRequests, now]);

  // 4. Status Counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Exploring: 0,
      Applying: 0,
      Submitted: 0,
      Interviewing: 0,
      Admitted: 0,
      Waitlisted: 0,
    };
    for (const app of applications) {
      const current = counts[app.status];
      if (current !== undefined) {
        counts[app.status] = current + 1;
      }
    }
    return counts;
  }, [applications]);

  // 5. Letters Per Recommender
  const recommenderStats = useMemo(() => {
    const recs = contacts.filter((c) => c.kind === 'recommender');
    return recs.map((rec) => {
      const requests = letterRequests.filter((l) => l.contact_id === rec.id && !l.deleted_at);
      const submitted = requests.filter(
        (l) => l.status === 'submitted' || l.status === 'confirmed_received',
      ).length;
      return {
        contact: rec,
        submitted,
        total: requests.length,
      };
    });
  }, [contacts, letterRequests]);

  // 6. Fees Breakdown
  const feesSummary = useMemo(() => {
    let planned = 0;
    let paid = 0;
    let waived = 0;

    for (const app of applications) {
      const fee = app.fee_amount ?? 0;
      if (app.waiver_status === 'granted') {
        waived += fee;
      } else if (app.fee_paid_on) {
        paid += fee;
      } else {
        planned += fee;
      }
    }
    return { planned, paid, waived, total: planned + paid + waived };
  }, [applications]);

  return (
    <div className="space-y-6">
      {/* Welcome / Empty State Hero when 0 applications */}
      {applications.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-6 shadow-xs dark:border-blue-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  Getting Started
                </span>
                <span className="text-xs text-slate-400">Local-first & private</span>
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Welcome to your PhD Application Command Center
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Track hard deadlines across global time zones, faculty correspondence,
                recommendation letter requests, and admission offers with zero telemetry or network
                calls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {hasUserData() && (
                <button
                  type="button"
                  onClick={async () => {
                    await loadUser();
                    showToast({ message: 'Loaded your outreach records & applications!' });
                    refresh();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  Load My Outreach (NC State & USF)
                </button>
              )}
              {onOpenQuickAdd && (
                <button
                  type="button"
                  onClick={onOpenQuickAdd}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Application
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  await loadDemo();
                  showToast({ message: 'Loaded fictional demo dataset.' });
                  refresh();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                Sample Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status metrics chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            onClick={() => onNavigate('applications')}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {status}
              </span>
              <StatusBadge status={status as ApplicationStatus} size="sm" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* At-risk banner if any */}
      {atRiskList.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{atRiskList.length} Application(s) At Risk</span>
          </div>
          <div className="mt-3 space-y-2">
            {atRiskList.map((item) => (
              <div
                key={item.application.id}
                onClick={() => onNavigate('applications', item.application.id)}
                className="cursor-pointer flex flex-wrap items-center justify-between rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-900 border border-rose-100 dark:border-rose-950 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {item.university.name}
                  </span>{' '}
                  <span className="text-slate-500">• {item.application.program}</span>
                  <p className="mt-0.5 text-rose-700 dark:text-rose-400">
                    {item.reasons.join(' ')}
                  </p>
                </div>
                <div className="w-28 mt-2 sm:mt-0">
                  <ProgressBar value={item.readiness} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Today List & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Today's Action List
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono">
              {todayActions.length} pending
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {todayActions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                You are all caught up! No urgent actions pending today.
              </div>
            ) : (
              todayActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3.5 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className="pr-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {action.badge}
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {action.title}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                      {action.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => action.onSnooze(1)}
                      className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Snooze 1d
                    </button>
                    <button
                      type="button"
                      onClick={action.onDone}
                      className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-2xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Upcoming Deadlines & Recommenders */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Deadlines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Upcoming Deadlines (60 Days)
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                  No upcoming deadlines in the next 60 days.
                </div>
              ) : (
                upcomingDeadlines.map(({ application, university, milestone }) => (
                  <div
                    key={application.id}
                    onClick={() => onNavigate('applications', application.id)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {university.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">{application.program}</p>
                      </div>
                      <StatusBadge status={application.status} size="sm" />
                    </div>

                    <CountdownBadge
                      dueLocal={milestone.due_local}
                      schoolTz={milestone.tz}
                      userTz={userTz}
                      timeAssumed={milestone.time_assumed}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommenders Progress */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Letters by Recommender
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('recommenders')}
                className="text-[11px] text-blue-600 hover:underline dark:text-blue-400"
              >
                Matrix view
              </button>
            </div>

            {recommenderStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No recommenders added yet.</p>
            ) : (
              <div className="space-y-3">
                {recommenderStats.map(({ contact, submitted, total }) => {
                  const pct = total === 0 ? 0 : Math.round((submitted / total) * 100);
                  return (
                    <div key={contact.id} className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {contact.name}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {submitted} of {total} submitted ({pct}%)
                        </span>
                      </div>
                      <ProgressBar value={pct} size="sm" showLabel={false} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fees Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Application Fees
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                <p className="text-[10px] text-slate-400">Planned</p>
                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  ${feesSummary.planned}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/60">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Paid</p>
                <p className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  ${feesSummary.paid}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/60">
                <p className="text-[10px] text-blue-700 dark:text-blue-400">Waived</p>
                <p className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                  ${feesSummary.waived}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
