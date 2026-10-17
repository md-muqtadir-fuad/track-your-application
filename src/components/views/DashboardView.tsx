import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, AlertTriangle, Clock, Users, FolderDown, Plus, ArrowRight } from 'lucide-react';
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

  // 1. Next actionable items across deadlines, checklist, letters, follow-ups
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
            badge: 'OUTREACH',
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

    // Letters to follow up
    for (const lr of letterRequests) {
      if (['asked', 'link_sent'].includes(lr.status)) {
        const app = appMap.get(lr.application_id);
        const contact = contacts.find((c) => c.id === lr.contact_id);
        if (app && contact) {
          const uni = uniMap.get(app.university_id);
          items.push({
            id: `letter-${lr.id}`,
            title: `Letter of recommendation from ${contact.name}`,
            subtitle: `${uni?.name} (${app.program})`,
            badge: 'RECOMMENDATION',
            applicationId: app.id,
            onDone: async () => {
              if (!repos) return;
              await repos.letterRequests.updateStatus(lr.id, 'submitted');
              showToast({ message: `Marked letter from ${contact.name} as submitted.` });
              refresh();
            },
            onSnooze: async (_days) => {
              if (!repos) return;
              showToast({ message: 'Snoozed letter reminder.' });
              refresh();
            },
          });
        }
      }
    }

    // Checklist items due
    for (const cl of checklistItems.filter((item) => item.status !== 'done' && !item.deleted_at)) {
      if (cl.due_local) {
        const dueDt = DateTime.fromISO(cl.due_local);
        if (dueDt.diff(now, 'days').days <= 14) {
          const app = appMap.get(cl.application_id);
          const uni = app ? uniMap.get(app.university_id) : undefined;
          items.push({
            id: `checklist-${cl.id}`,
            title: cl.label,
            subtitle: `${uni?.name ?? 'General'} • ${cl.kind.toUpperCase()}`,
            badge: 'CHECKLIST',
            applicationId: cl.application_id,
            dueDate: cl.due_local,
            onDone: async () => {
              if (!repos) return;
              await repos.checklistItems.updateStatus(cl.id, 'done');
              showToast({ message: `Completed "${cl.label}".` });
              refresh();
            },
            onSnooze: async (days) => {
              if (!repos) return;
              const snoozed = DateTime.now().plus({ days }).toISODate()!;
              await repos.checklistItems.update(cl.id, { due_local: snoozed });
              showToast({ message: `Rescheduled to ${snoozed}.` });
              refresh();
            },
          });
        }
      }
    }

    return items.slice(0, 8);
  }, [contacts, letterRequests, checklistItems, appMap, uniMap, repos, now, refresh, showToast]);

  // 2. Upcoming Deadlines (next 60 days)
  const upcomingDeadlines = useMemo(() => {
    const list: Array<{
      application: Application;
      university: University;
      milestone: Milestone;
      sortTime: number;
    }> = [];

    for (const app of applications) {
      if (['Withdrawn', 'Declined', 'Rejected'].includes(app.status)) continue;
      const uni = uniMap.get(app.university_id);
      if (!uni) continue;

      const appMilestones = milestones.filter(
        (m) => m.application_id === app.id && m.kind === 'application',
      );
      for (const m of appMilestones) {
        const dt = parseWallClock(m.due_local, m.tz);
        const daysDiff = dt.diff(now, 'days').days;
        if (daysDiff >= -1 && daysDiff <= 60) {
          list.push({
            application: app,
            university: uni,
            milestone: m,
            sortTime: dt.toMillis(),
          });
        }
      }
    }

    list.sort((a, b) => a.sortTime - b.sortTime);
    return list;
  }, [applications, uniMap, milestones, now]);

  // 3. At-risk applications
  const atRiskList = useMemo(() => {
    return applications
      .filter((app) => !['Withdrawn', 'Declined', 'Rejected', 'Accepted'].includes(app.status))
      .map((app) => {
        const uni = uniMap.get(app.university_id);
        const appLetters = letterRequests.filter((l) => l.application_id === app.id);
        const appChecklist = checklistItems.filter((c) => c.application_id === app.id);
        const deadlineMilestone = milestones.find(
          (m) => m.application_id === app.id && m.kind === 'application',
        );

        const readiness = calculateReadiness(appChecklist, appLetters);
        const risk = isAtRisk(app, deadlineMilestone, readiness, appLetters, now);

        return {
          application: app,
          university: uni ?? {
            name: 'Unknown University',
            tz: 'UTC',
            id: '',
            created_at: '',
            updated_at: '',
          },
          reasons: risk.reasons,
          readiness: readiness,
        };
      })
      .filter((item) => item.reasons.length > 0);
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

  // 5. Financials
  const feesSummary = useMemo(() => {
    let planned = 0;
    let paid = 0;
    let waived = 0;

    for (const app of applications) {
      const fee = app.fee_amount ?? 85;
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Dossier Header & Identification */}
      <div className="border-b-2 border-[#000000] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="font-mono text-[10px] tracking-widest uppercase text-[#8E1616] font-bold">
              RECORD ARCHIVE • ACADEMIC YEAR 2026–2027
            </span>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#000000] mt-1">
              Doctoral Application Dossier
            </h1>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-[#000000]/70">
            <span>
              TARGET PROGRAMS: <strong className="text-[#8E1616]">{applications.length}</strong>
            </span>
            <span>•</span>
            <span>
              TIMEZONE: <strong className="text-[#000000]">{userTz}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Empty State / Quick Load */}
      {applications.length === 0 && (
        <div className="border border-[#000000] bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <h2 className="font-serif text-xl font-bold text-[#8E1616]">
                Initiate Candidate Records
              </h2>
              <p className="text-xs text-[#000000]/70 leading-relaxed font-sans">
                No active program entries found in local database. Load verified university outreach
                dossiers or create a new entry.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {hasUserData() && (
                <button
                  type="button"
                  onClick={async () => {
                    await loadUser();
                    showToast({ message: 'Loaded outreach records (NC State & USF)' });
                    refresh();
                  }}
                  className="inline-flex items-center gap-2 bg-[#8E1616] text-[#F8EEDF] px-3.5 py-2 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-[#6d1010] border border-[#8E1616] transition"
                >
                  <FolderDown className="h-4 w-4 text-[#E8C999]" />
                  Load Dossier (NC State & USF)
                </button>
              )}
              {onOpenQuickAdd && (
                <button
                  type="button"
                  onClick={onOpenQuickAdd}
                  className="inline-flex items-center gap-1.5 border border-[#000000] bg-white px-3 py-2 text-xs font-mono font-semibold text-[#000000] hover:bg-[#E8C999]/30 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Entry
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  await loadDemo();
                  showToast({ message: 'Loaded fictional dataset.' });
                  refresh();
                }}
                className="inline-flex items-center gap-1.5 border border-[#000000]/30 bg-transparent px-3 py-2 text-xs font-mono text-[#000000]/60 hover:bg-[#000000]/5 transition"
              >
                Sample Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCIENTIFIC FIGURE 1: Doctoral Application Pipeline Vector Plot */}
      <div className="border border-[#000000] bg-white p-5">
        <div className="flex items-center justify-between border-b border-[#000000]/15 pb-2 mb-4">
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-[#8E1616]">
            FIG. 1 — APPLICATION LIFECYCLE & STAGE VERIFICATION
          </span>
          <span className="font-mono text-[10px] text-[#000000]/50">DISCRETE PHASE STATE</span>
        </div>

        {/* Vector SVG Diagram */}
        <div className="w-full overflow-x-auto py-2">
          <svg viewBox="0 0 880 90" className="w-full min-w-[700px] h-24 select-none">
            {/* Axis Baseline */}
            <line
              x1="40"
              y1="45"
              x2="840"
              y2="45"
              stroke="#000000"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Milestone Nodes */}
            {[
              { label: 'Outreach', count: contacts.length, stage: 1, x: 70 },
              { label: 'Transcripts', count: applications.length, stage: 2, x: 200 },
              { label: 'SOP Draft', count: applications.length, stage: 3, x: 330 },
              { label: 'Rec Letters', count: letterRequests.length, stage: 4, x: 460 },
              { label: 'Portal Filing', count: statusCounts.Submitted ?? 0, stage: 5, x: 590 },
              { label: 'Interview', count: statusCounts.Interviewing ?? 0, stage: 6, x: 710 },
              { label: 'Decision', count: statusCounts.Admitted ?? 0, stage: 7, x: 820 },
            ].map((node) => {
              const isFilled = (node.count ?? 0) > 0;
              return (
                <g key={node.label}>
                  {/* Stem */}
                  <line
                    x1={node.x}
                    y1="35"
                    x2={node.x}
                    y2="55"
                    stroke="#8E1616"
                    strokeWidth="1.5"
                  />
                  {/* Node Circle */}
                  <circle
                    cx={node.x}
                    cy="45"
                    r="14"
                    fill={isFilled ? '#8E1616' : '#FFFFFF'}
                    stroke="#000000"
                    strokeWidth="1.5"
                  />
                  {/* Inner Count */}
                  <text
                    x={node.x}
                    y="49"
                    textAnchor="middle"
                    fill={isFilled ? '#F8EEDF' : '#000000'}
                    fontSize="11"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {node.count}
                  </text>
                  {/* Node Label */}
                  <text
                    x={node.x}
                    y="76"
                    textAnchor="middle"
                    fill="#000000"
                    fontSize="11"
                    fontFamily="EB Garamond, serif"
                    fontWeight="bold"
                  >
                    {node.label}
                  </text>
                  {/* Phase Index */}
                  <text
                    x={node.x}
                    y="24"
                    textAnchor="middle"
                    fill="#8E1616"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    §0{node.stage}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="scientific-caption border-t border-[#000000]/10 pt-2 flex justify-between">
          <span>
            Figure 1: Sequential doctoral candidacy phases across institutional submissions.
          </span>
          <span className="font-mono text-[10px] text-[#8E1616]">
            Filled nodes denote documented candidate progress.
          </span>
        </div>
      </div>

      {/* TABLE 1: Institutional Target Docket (LaTeX Booktabs Style) */}
      <div className="border border-[#000000] bg-white p-5">
        <div className="flex items-center justify-between border-b border-[#000000]/15 pb-2 mb-4">
          <div>
            <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-[#8E1616]">
              TABLE 1 — ACTIVE INSTITUTIONAL TARGETS & REVIEW STATUS
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="font-mono text-xs text-[#8E1616] hover:underline inline-flex items-center gap-1 font-semibold"
          >
            Manage Applications <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {applications.length === 0 ? (
          <p className="text-xs font-serif italic text-[#000000]/50 py-4 text-center">
            No active institutional entries in current record docket.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="scientific-table font-sans">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Institution</th>
                  <th style={{ width: '25%' }}>Program & Degree</th>
                  <th style={{ width: '20%' }}>Advisor Outreach</th>
                  <th style={{ width: '15%' }}>Deadline (Wall-Clock)</th>
                  <th style={{ width: '15%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const uni = uniMap.get(app.university_id);
                  const appFaculty = contacts.find(
                    (c) =>
                      c.kind === 'faculty' &&
                      c.notes?.toLowerCase().includes(uni?.name.toLowerCase() ?? ''),
                  );
                  const appMilestone = milestones.find(
                    (m) => m.application_id === app.id && m.kind === 'application',
                  );

                  return (
                    <tr
                      key={app.id}
                      onClick={() => onNavigate('applications', app.id)}
                      className="cursor-pointer hover:bg-[#E8C999]/20 transition-colors"
                    >
                      <td>
                        <div className="font-serif font-bold text-sm text-[#000000]">
                          {uni?.name ?? 'Unknown University'}
                        </div>
                        <div className="font-mono text-[10px] text-[#000000]/50">
                          {uni?.city}, {uni?.country}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-xs text-[#000000]">{app.program}</div>
                        <div className="font-mono text-[10px] text-[#8E1616] uppercase">
                          {app.term} • Priority {app.priority}
                        </div>
                      </td>
                      <td>
                        {appFaculty ? (
                          <div>
                            <div className="font-serif font-bold text-xs text-[#000000]">
                              {appFaculty.name}
                            </div>
                            <div className="font-mono text-[10px] text-[#8E1616]">
                              Status: {appFaculty.outreach_status.toUpperCase()}
                            </div>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-[#000000]/40">
                            No faculty logged
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-xs">
                        {appMilestone ? (
                          <div>
                            <span className="font-bold text-[#8E1616]">
                              {appMilestone.due_local.slice(0, 10)}
                            </span>
                            <span className="text-[10px] text-[#000000]/60 block">
                              {appMilestone.due_local.slice(11, 16)}{' '}
                              {appMilestone.tz.split('/')[1]?.replace('_', ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#000000]/40">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* At-Risk Warning (If Detected) */}
      {atRiskList.length > 0 && (
        <div className="border border-[#8E1616] bg-[#F8EEDF] p-4">
          <div className="flex items-center gap-2 text-[#8E1616] font-serif font-bold text-base">
            <AlertTriangle className="h-4 w-4 text-[#8E1616]" />
            <span>ATTENTION: {atRiskList.length} Program Submission(s) At Risk</span>
          </div>
          <div className="mt-3 space-y-2">
            {atRiskList.map((item) => (
              <div
                key={item.application.id}
                onClick={() => onNavigate('applications', item.application.id)}
                className="cursor-pointer border border-[#8E1616]/30 bg-white p-3 text-xs flex justify-between items-center"
              >
                <div>
                  <span className="font-serif font-bold text-[#000000] text-sm">
                    {item.university.name}
                  </span>{' '}
                  <span className="font-mono text-[#000000]/60 text-[11px]">
                    ({item.application.program})
                  </span>
                  <p className="mt-0.5 font-mono text-[11px] text-[#8E1616]">
                    {item.reasons.join(' ')}
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <ProgressBar value={item.readiness} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Agenda & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Scholarly Checklist / Action Docket */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-[#000000] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#000000]/15 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#8E1616]" />
                <h3 className="font-serif text-base font-bold text-[#000000]">
                  Immediate Candidacy Actions
                </h3>
              </div>
              <span className="font-mono text-[10px] font-bold text-[#8E1616] border border-[#8E1616] px-1.5 py-0.2">
                {todayActions.length} PENDING
              </span>
            </div>

            <div className="divide-y divide-[#000000]/10">
              {todayActions.length === 0 ? (
                <div className="p-8 text-center text-xs font-serif italic text-[#000000]/60">
                  No immediate actions scheduled for today. All doctoral deadlines and outreach
                  tasks are on trajectory.
                </div>
              ) : (
                todayActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between py-3 text-xs hover:bg-[#E8C999]/15 transition-colors"
                  >
                    <div className="pr-3">
                      <div className="flex items-center gap-2">
                        <span className="border border-[#000000] bg-[#F8EEDF] px-1 py-0.2 text-[9px] font-mono font-bold text-[#000000]">
                          {action.badge}
                        </span>
                        <p className="font-serif font-bold text-[#000000] text-sm">
                          {action.title}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#000000]/60 font-sans">
                        {action.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <button
                        type="button"
                        onClick={() => action.onSnooze(1)}
                        className="border border-[#000000]/25 bg-[#F8EEDF] px-2 py-1 text-[10px] text-[#000000] hover:bg-[#E8C999]/50"
                      >
                        Defer 1d
                      </button>
                      <button
                        type="button"
                        onClick={action.onDone}
                        className="bg-[#8E1616] text-[#F8EEDF] px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-[#6d1010]"
                      >
                        Mark Done
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FIG. 2B: Financial & Fee Ledger */}
          <div className="border border-[#000000] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#000000]/15 pb-2 mb-3">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-[#8E1616]">
                FIG. 2 — APPLICATION FEE & WAIVER ALLOCATION ($USD)
              </span>
              <span className="font-mono text-xs font-bold text-[#000000]">
                TOTAL: ${feesSummary.total}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center my-3 font-mono">
              <div className="border border-[#000000]/20 p-2 bg-[#F8EEDF]/40">
                <span className="text-[10px] text-[#000000]/60 block">PLANNED</span>
                <span className="font-bold text-base text-[#8E1616]">${feesSummary.planned}</span>
              </div>
              <div className="border border-[#000000]/20 p-2 bg-[#F8EEDF]/40">
                <span className="text-[10px] text-[#000000]/60 block">PAID</span>
                <span className="font-bold text-base text-[#000000]">${feesSummary.paid}</span>
              </div>
              <div className="border border-[#000000]/20 p-2 bg-[#E8C999]/30">
                <span className="text-[10px] text-[#000000]/60 block">WAIVED</span>
                <span className="font-bold text-base text-[#8E1616]">${feesSummary.waived}</span>
              </div>
            </div>

            <div className="scientific-caption border-t border-[#000000]/10 pt-2">
              Figure 2: Financial ledger of institutional fee allocations, payments, and granted
              departmental waivers.
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Chronological Deadlines Horizon */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-[#000000] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#000000]/15 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#8E1616]" />
                <h3 className="font-serif text-base font-bold text-[#000000]">
                  Chronological Horizon (60 Days)
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <div className="border border-dashed border-[#000000]/20 p-6 text-center text-xs font-serif italic text-[#000000]/50">
                  No program deadlines logged within the next 60 days.
                </div>
              ) : (
                upcomingDeadlines.map(({ application, university, milestone }) => (
                  <div
                    key={application.id}
                    onClick={() => onNavigate('applications', application.id)}
                    className="cursor-pointer border border-[#000000]/20 bg-white p-3 hover:border-[#8E1616] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#000000]">
                          {university.name}
                        </h4>
                        <p className="font-mono text-[10px] text-[#000000]/60">
                          {application.program}
                        </p>
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

          {/* Letter of Recommendation Status Matrix */}
          <div className="border border-[#000000] bg-white p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#000000]/15 pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#8E1616]" />
                <h4 className="font-serif text-sm font-bold text-[#000000]">
                  Letters by Recommender
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('recommenders')}
                className="font-mono text-[10px] text-[#8E1616] hover:underline uppercase font-bold"
              >
                Matrix ➔
              </button>
            </div>

            {letterRequests.length === 0 ? (
              <p className="text-xs font-serif italic text-[#000000]/50 py-2">
                No recommendation requests tracked yet. Add recommenders under the Recommenders tab.
              </p>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {contacts
                  .filter((c) => c.kind === 'recommender')
                  .map((rec) => {
                    const reqs = letterRequests.filter(
                      (l) => l.contact_id === rec.id && !l.deleted_at,
                    );
                    const done = reqs.filter((l) =>
                      ['submitted', 'confirmed_received'].includes(l.status),
                    ).length;
                    return (
                      <div key={rec.id} className="border-b border-[#000000]/10 pb-2">
                        <div className="flex justify-between font-bold">
                          <span className="font-serif text-[#000000]">{rec.name}</span>
                          <span className="text-[#8E1616]">
                            {done} / {reqs.length} submitted
                          </span>
                        </div>
                        <div className="text-[10px] text-[#000000]/50">{rec.title}</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
