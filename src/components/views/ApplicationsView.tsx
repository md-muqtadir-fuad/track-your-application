import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutList,
  Kanban,
  Plus,
  Search,
  ArrowUpDown,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { StatusBadge } from '../ui/StatusBadge';
import { CountdownBadge } from '../ui/CountdownBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { QuickAddModal } from './QuickAddModal';
import { ApplicationDetailModal } from './ApplicationDetailModal';
import { calculateReadiness } from '../../lib/services/application-service';
import type {
  Application,
  University,
  Milestone,
  ChecklistItem,
  LetterRequest,
  ApplicationStatus,
} from '../../lib/db/schema';

export const ApplicationsView: React.FC = () => {
  const { repos, userTz, version, refresh } = useDatabase();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [applications, setApplications] = useState<Application[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [letterRequests, setLetterRequests] = useState<LetterRequest[]>([]);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [degreeFilter, setDegreeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'university' | 'priority' | 'readiness'>(
    'deadline',
  );
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Board collapsible terminal statuses
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);

  const loadAll = useCallback(async () => {
    if (!repos) return;
    const [apps, unis, ms, cl, lr] = await Promise.all([
      repos.applications.list(),
      repos.universities.list(),
      repos.milestones.listAll(),
      repos.checklistItems.listAll(),
      repos.letterRequests.listAll(),
    ]);
    setApplications(apps);
    setUniversities(unis);
    setMilestones(ms);
    setChecklistItems(cl);
    setLetterRequests(lr);
  }, [repos]);

  useEffect(() => {
    loadAll();
  }, [loadAll, version]);

  const uniMap = useMemo(() => {
    const map = new Map<string, University>();
    for (const u of universities) {
      map.set(u.id, u);
    }
    return map;
  }, [universities]);

  const deadlineMap = useMemo(() => {
    const map = new Map<string, Milestone>();
    for (const m of milestones) {
      if (m.kind === 'application' || !map.has(m.application_id)) {
        map.set(m.application_id, m);
      }
    }
    return map;
  }, [milestones]);

  const readinessMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of applications) {
      const items = checklistItems.filter((i) => i.application_id === app.id);
      const letters = letterRequests.filter((l) => l.application_id === app.id);
      map.set(app.id, calculateReadiness(items, letters));
    }
    return map;
  }, [applications, checklistItems, letterRequests]);

  // Filtering & Sorting
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const uni = uniMap.get(app.university_id);
      const matchesSearch =
        searchQuery === '' ||
        app.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (uni && uni.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        app.notes.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active'
          ? !['Accepted', 'Declined', 'Withdrawn', 'Rejected'].includes(app.status)
          : app.status === statusFilter);

      const matchesDegree = degreeFilter === 'all' || app.degree === degreeFilter;

      return matchesSearch && matchesStatus && matchesDegree;
    });
  }, [applications, uniMap, searchQuery, statusFilter, degreeFilter]);

  const sortedApps = useMemo(() => {
    return [...filteredApps].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'deadline') {
        const da = deadlineMap.get(a.id)?.due_local ?? '9999';
        const db = deadlineMap.get(b.id)?.due_local ?? '9999';
        comparison = da.localeCompare(db);
      } else if (sortBy === 'university') {
        const ua = uniMap.get(a.university_id)?.name ?? '';
        const ub = uniMap.get(b.university_id)?.name ?? '';
        comparison = ua.localeCompare(ub);
      } else if (sortBy === 'priority') {
        comparison = a.priority - b.priority;
      } else if (sortBy === 'readiness') {
        comparison = (readinessMap.get(a.id) ?? 0) - (readinessMap.get(b.id) ?? 0);
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredApps, sortBy, sortAsc, deadlineMap, uniMap, readinessMap]);

  const handleStatusChange = async (app: Application, nextStatus: ApplicationStatus) => {
    if (!repos) return;
    const prevStatus = app.status;
    await repos.applications.updateStatus(app.id, nextStatus);
    showToast({
      message: `Marked ${app.program} as ${nextStatus}.`,
      undoAction: async () => {
        await repos.applications.updateStatus(app.id, prevStatus);
        refresh();
      },
    });
    refresh();
  };

  const handlePriorityChange = async (app: Application, p: 1 | 2 | 3) => {
    if (!repos) return;
    await repos.applications.update(app.id, { priority: p });
    refresh();
  };

  const handleDelete = async (app: Application) => {
    if (!repos) return;
    await repos.applications.softDelete(app.id);
    showToast({
      message: `Deleted application for ${app.program}.`,
      undoAction: async () => {
        await repos.applications.restore(app.id);
        refresh();
      },
    });
    refresh();
  };

  const activeColumns: ApplicationStatus[] = [
    'Exploring',
    'Applying',
    'Submitted',
    'Interviewing',
    'Admitted',
    'Waitlisted',
  ];

  const terminalStatuses: ApplicationStatus[] = ['Accepted', 'Declined', 'Withdrawn', 'Rejected'];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#000000]/40" />
            <input
              type="text"
              placeholder="Search applications, schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-none border border-[#000000]/25 bg-[#F8EEDF] pl-9 pr-4 py-2 text-xs text-[#000000] focus:border-[#8E1616] focus:outline-none focus:ring-1 focus:ring-[#8E1616] w-64"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-none border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              {activeColumns.concat(terminalStatuses).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={degreeFilter}
              onChange={(e) => setDegreeFilter(e.target.value)}
              className="rounded-none border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
            >
              <option value="all">All Degrees</option>
              <option value="phd">PhD</option>
              <option value="ms">MS</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-none border border-[#000000]/25 bg-[#F8EEDF] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                viewMode === 'board'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Board
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-none bg-[#8E1616] px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Application
            <kbd className="ml-1 hidden sm:inline-block rounded-none bg-[#6d1010] px-1 text-[9px] text-[#E8C999]">
              Ctrl+N
            </kbd>
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-hidden border border-[#000000]/25 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#000000]">
              <thead className="border-b-2 border-[#000000] bg-[#E8C999]/35 font-serif font-bold text-[#000000]">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-[#8E1616]"
                    onClick={() => {
                      if (sortBy === 'university') setSortAsc(!sortAsc);
                      else {
                        setSortBy('university');
                        setSortAsc(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>University & Program</span>
                      <ArrowUpDown className="h-3 w-3 text-[#8E1616]" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-[#8E1616]"
                    onClick={() => {
                      if (sortBy === 'deadline') setSortAsc(!sortAsc);
                      else {
                        setSortBy('deadline');
                        setSortAsc(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Deadline</span>
                      <ArrowUpDown className="h-3 w-3 text-[#8E1616]" />
                    </div>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-[#8E1616]"
                    onClick={() => {
                      if (sortBy === 'priority') setSortAsc(!sortAsc);
                      else {
                        setSortBy('priority');
                        setSortAsc(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Priority</span>
                      <ArrowUpDown className="h-3 w-3 text-[#8E1616]" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-[#8E1616]"
                    onClick={() => {
                      if (sortBy === 'readiness') setSortAsc(!sortAsc);
                      else {
                        setSortBy('readiness');
                        setSortAsc(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Readiness</span>
                      <ArrowUpDown className="h-3 w-3 text-[#8E1616]" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000000]/10 bg-white">
                {sortedApps.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center font-serif italic text-[#000000]/50"
                    >
                      No applications found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  sortedApps.map((app) => {
                    const uni = uniMap.get(app.university_id);
                    const milestone = deadlineMap.get(app.id);
                    const readiness = readinessMap.get(app.id) ?? 0;

                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedAppId(app.id)}
                        className="cursor-pointer hover:bg-[#E8C999]/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-serif font-bold text-sm text-[#000000]">
                            {uni ? uni.name : 'Unknown University'}
                          </p>
                          <p className="text-[11px] font-mono text-[#000000]/70">
                            {app.program} • {app.term} ({app.degree.toUpperCase()})
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {milestone ? (
                            <CountdownBadge
                              dueLocal={milestone.due_local}
                              schoolTz={milestone.tz}
                              userTz={userTz}
                              timeAssumed={milestone.time_assumed}
                              compact
                            />
                          ) : (
                            <span className="font-mono text-[#000000]/40">No date</span>
                          )}
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleStatusChange(app, e.target.value as ApplicationStatus)
                            }
                            className="rounded-none border border-[#000000]/25 bg-[#F8EEDF] px-2 py-1 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                          >
                            {activeColumns.concat(terminalStatuses).map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={app.priority}
                            onChange={(e) =>
                              handlePriorityChange(app, parseInt(e.target.value, 10) as 1 | 2 | 3)
                            }
                            className="rounded-none border border-[#000000]/25 bg-[#F8EEDF] px-2 py-1 text-xs font-mono font-medium text-[#000000] focus:border-[#8E1616] focus:outline-none"
                          >
                            <option value={1}>Tier 1 (High)</option>
                            <option value={2}>Tier 2 (Mid)</option>
                            <option value={3}>Tier 3 (Std)</option>
                          </select>
                        </td>

                        <td className="px-4 py-3 w-40">
                          <ProgressBar value={readiness} size="sm" />
                        </td>

                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDelete(app)}
                            className="rounded-none p-1 text-[#000000]/40 hover:text-[#8E1616] hover:bg-[#8E1616]/10"
                            aria-label={`Delete ${app.program}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Board (Kanban) View */}
      {viewMode === 'board' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {activeColumns.map((col) => {
              const colApps = sortedApps.filter((a) => a.status === col);
              return (
                <div
                  key={col}
                  className="flex flex-col border border-[#000000]/20 bg-[#F8EEDF] p-3 min-h-[450px]"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-[#000000]/15 pb-2">
                    <StatusBadge status={col} size="sm" />
                    <span className="font-mono text-xs font-bold text-[#8E1616]">
                      {colApps.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {colApps.map((app) => {
                      const uni = uniMap.get(app.university_id);
                      const milestone = deadlineMap.get(app.id);
                      const readiness = readinessMap.get(app.id) ?? 0;

                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedAppId(app.id)}
                          className="cursor-pointer border border-[#000000]/20 bg-white p-3 shadow-xs hover:border-[#8E1616] hover:bg-[#E8C999]/15 transition-all text-[#000000]"
                        >
                          <p className="font-serif font-bold text-xs text-[#000000]">{uni?.name}</p>
                          <p className="text-[11px] font-mono text-[#000000]/70 mt-0.5 line-clamp-1">
                            {app.program}
                          </p>

                          <div className="mt-2.5">
                            {milestone && (
                              <CountdownBadge
                                dueLocal={milestone.due_local}
                                schoolTz={milestone.tz}
                                userTz={userTz}
                                timeAssumed={milestone.time_assumed}
                                compact
                              />
                            )}
                          </div>

                          <div className="mt-3">
                            <ProgressBar value={readiness} size="sm" />
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-[#000000]/10 pt-2 text-[10px] font-mono text-[#000000]/60">
                            <span>Priority T{app.priority}</span>
                            <span className="capitalize">{app.degree}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collapsed Terminal Statuses */}
          <div className="border border-[#000000]/20 bg-white p-4">
            <button
              type="button"
              onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
              className="flex w-full items-center justify-between text-xs font-serif font-bold text-[#000000]"
            >
              <div className="flex items-center gap-2">
                {isTerminalExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#8E1616]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#8E1616]" />
                )}
                <span>Closed / Terminal Applications</span>
                <span className="border border-[#000000]/20 bg-[#F8EEDF] px-2 py-0.5 text-[10px] font-mono text-[#000000]">
                  {sortedApps.filter((a) => terminalStatuses.includes(a.status)).length}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#000000]/50 font-normal">
                Accepted, Declined, Withdrawn, Rejected
              </span>
            </button>

            {isTerminalExpanded && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {sortedApps
                  .filter((a) => terminalStatuses.includes(a.status))
                  .map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className="cursor-pointer border border-[#000000]/20 bg-[#F8EEDF] p-3 text-xs hover:border-[#8E1616]"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-serif font-bold text-[#000000]">
                          {uniMap.get(app.university_id)?.name}
                        </span>
                        <StatusBadge status={app.status} size="sm" />
                      </div>
                      <p className="text-[11px] font-mono text-[#000000]/60 line-clamp-1">
                        {app.program}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={(id) => setSelectedAppId(id)}
      />

      {/* Application Detail Modal */}
      {selectedAppId && (
        <ApplicationDetailModal
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      )}
    </div>
  );
};
