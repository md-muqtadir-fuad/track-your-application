import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { CountdownBadge } from '../ui/CountdownBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { calculateReadiness } from '../../lib/services/application-service';
import type {
  Application,
  University,
  Milestone,
  ChecklistItem,
  LetterRequest,
  Contact,
  StatusChange,
  Offer,
  ApplicationStatus,
  ChecklistItemStatus,
  LetterRequestStatus,
} from '../../lib/db/schema';

interface ApplicationDetailModalProps {
  applicationId: string | null;
  onClose: () => void;
}

type TabType = 'checklist' | 'letters' | 'faculty' | 'dates' | 'fees' | 'timeline' | 'offer';

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  applicationId,
  onClose,
}) => {
  const { repos, userTz, refresh } = useDatabase();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('checklist');
  const [app, setApp] = useState<Application | null>(null);
  const [uni, setUni] = useState<University | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [letters, setLetters] = useState<LetterRequest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([]);
  const [offer, setOffer] = useState<Offer | null>(null);

  // New item input states
  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [waiverWarning, setWaiverWarning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!repos || !applicationId) return;
    const a = await repos.applications.getById(applicationId);
    if (!a) return;
    setApp(a);
    setNotesDraft(a.notes);

    const [u, ms, cl, lr, allContacts, sh, off] = await Promise.all([
      repos.universities.getById(a.university_id),
      repos.milestones.listByApplication(applicationId),
      repos.checklistItems.listByApplication(applicationId),
      repos.letterRequests.listByApplication(applicationId),
      repos.contacts.list(),
      repos.statusChanges.listByApplication(applicationId),
      repos.offers.getByApplicationId(applicationId),
    ]);

    setUni(u);
    setMilestones(ms);
    setChecklist(cl);
    setLetters(lr);
    setContacts(allContacts);
    setStatusHistory(sh);
    setOffer(off);
  }, [repos, applicationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!app || !uni) return null;

  const deadlineMilestone = milestones.find((m) => m.kind === 'application') ?? milestones[0];
  const readiness = calculateReadiness(checklist, letters);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!repos) return;

    // Check fee waiver warning
    if (newStatus === 'Submitted' && app.waiver_status === 'requested') {
      setWaiverWarning(
        'Warning: You have a fee waiver request still pending. Submitting before it is granted may forfeit the waiver.',
      );
    } else {
      setWaiverWarning(null);
    }

    const previousStatus = app.status;
    await repos.applications.updateStatus(app.id, newStatus);
    showToast({
      message: `Marked as ${newStatus}.`,
      undoAction: async () => {
        await repos.applications.updateStatus(app.id, previousStatus);
        refresh();
        loadData();
      },
    });
    refresh();
    loadData();
  };

  const handleToggleChecklist = async (item: ChecklistItem) => {
    if (!repos) return;
    const nextStatus: ChecklistItemStatus = item.status === 'done' ? 'todo' : 'done';
    await repos.checklistItems.update(item.id, { status: nextStatus });
    refresh();
    loadData();
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos || !newChecklistLabel.trim()) return;
    await repos.checklistItems.create({
      application_id: app.id,
      kind: 'other',
      label: newChecklistLabel.trim(),
      status: 'todo',
    });
    setNewChecklistLabel('');
    refresh();
    loadData();
  };

  const handleDeleteChecklistItem = async (id: string) => {
    if (!repos) return;
    await repos.checklistItems.softDelete(id);
    refresh();
    loadData();
  };

  const handleLetterStatusChange = async (letterId: string, status: LetterRequestStatus) => {
    if (!repos) return;
    await repos.letterRequests.updateStatus(letterId, status);
    refresh();
    loadData();
  };

  const handleSaveNotes = async () => {
    if (!repos) return;
    await repos.applications.update(app.id, { notes: notesDraft });
    showToast({ message: 'Notes saved.' });
    refresh();
    loadData();
  };

  const handleSaveOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!repos) return;
    const form = new FormData(e.currentTarget);
    const stipend = parseFloat(form.get('stipend_amount') as string) || null;
    const years = parseInt(form.get('years_guaranteed') as string, 10) || null;

    await repos.offers.upsert({
      application_id: app.id,
      funding_type: form.get('funding_type') as string as Offer['funding_type'],
      stipend_amount: stipend,
      stipend_period: form.get('stipend_period') as string as Offer['stipend_period'],
      currency: (form.get('currency') as string) || 'USD',
      tuition: form.get('tuition') as string as Offer['tuition'],
      health_insurance: form.get('health_insurance') as string as Offer['health_insurance'],
      years_guaranteed: years,
      response_due_local:
        (form.get('response_due_local') as string) || `${new Date().getFullYear() + 1}-04-15T23:59`,
      response_tz: uni.tz,
      decision: form.get('decision') as string as Offer['decision'],
    });

    showToast({ message: 'Offer details updated.' });
    refresh();
    loadData();
  };

  const allStatuses: ApplicationStatus[] = [
    'Exploring',
    'Applying',
    'Submitted',
    'Interviewing',
    'Admitted',
    'Waitlisted',
    'Accepted',
    'Declined',
    'Withdrawn',
    'Rejected',
  ];

  return (
    <Modal
      isOpen={Boolean(applicationId)}
      onClose={onClose}
      title={app.program}
      description={`${uni.name} • ${app.term} (${app.degree.toUpperCase()})`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Header Badges & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <select
              value={app.status}
              onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
            >
              {allStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <StatusBadge status={app.status} size="sm" />
          </div>

          <div className="flex items-center gap-3">
            {app.portal_url && (
              <a
                href={app.portal_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLink className="h-3 w-3" />
                Portal {app.portal_username && `(${app.portal_username})`}
              </a>
            )}
            {app.program_url && (
              <a
                href={app.program_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline dark:text-slate-400"
              >
                <ExternalLink className="h-3 w-3" />
                Program Page
              </a>
            )}
          </div>
        </div>

        {waiverWarning && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{waiverWarning}</span>
          </div>
        )}

        {/* Live Deadline & Readiness */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deadlineMilestone ? (
            <CountdownBadge
              dueLocal={deadlineMilestone.due_local}
              schoolTz={deadlineMilestone.tz}
              userTz={userTz}
              timeAssumed={deadlineMilestone.time_assumed}
            />
          ) : (
            <div className="rounded-md border border-dashed p-3 text-xs text-slate-400">
              No application deadline milestone recorded.
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-center">
            <ProgressBar value={readiness} size="md" />
            <p className="mt-1 text-[11px] text-slate-400">{readiness}% requirements completed</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs">
          {[
            {
              id: 'checklist',
              label: `Checklist (${checklist.filter((c) => c.status === 'done').length}/${checklist.length})`,
            },
            {
              id: 'letters',
              label: `Letters (${letters.filter((l) => l.status === 'submitted' || l.status === 'confirmed_received').length}/${letters.length})`,
            },
            { id: 'faculty', label: 'Faculty' },
            { id: 'dates', label: `Key Dates (${milestones.length})` },
            { id: 'fees', label: 'Fees & Waiver' },
            { id: 'timeline', label: 'Timeline & Notes' },
            { id: 'offer', label: 'Decision & Offer' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-2 font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {/* 1. Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom checklist requirement..."
                  value={newChecklistLabel}
                  onChange={(e) => setNewChecklistLabel(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </form>

              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={item.status === 'done'}
                        onChange={() => handleToggleChecklist(item)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={
                          item.status === 'done'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'font-medium text-slate-800 dark:text-slate-200'
                        }
                      >
                        {item.label}
                      </span>
                    </label>

                    <div className="flex items-center gap-3">
                      {item.status === 'not_required' ? (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Not Required
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        aria-label="Delete requirement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Letters Tab */}
          {activeTab === 'letters' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Letters are requested per institution. Some portals do not allow changing
                recommenders after submission.
              </p>
              <div className="space-y-3">
                {letters.map((req) => {
                  const contact = contacts.find((c) => c.id === req.contact_id);
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-xs dark:border-slate-800"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {contact ? contact.name : 'Unknown Recommender'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {contact?.email} • {contact?.affiliation}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={req.status}
                          onChange={(e) =>
                            handleLetterStatusChange(req.id, e.target.value as LetterRequestStatus)
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="not_requested">Not Requested</option>
                          <option value="asked">Asked</option>
                          <option value="link_sent">Link Sent</option>
                          <option value="submitted">Submitted</option>
                          <option value="confirmed_received">Confirmed Received</option>
                          <option value="declined">Declined</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Faculty Tab */}
          {activeTab === 'faculty' && (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Faculty Contact Policy:
                </span>{' '}
                <span className="capitalize">{app.faculty_contact_policy}</span>
              </div>
              <p className="text-xs text-slate-500">
                Review outreach interactions and prospective advisors linked to this department.
              </p>
              {contacts
                .filter((c) => c.kind === 'faculty' && c.university_id === uni.id)
                .map((fac) => (
                  <div
                    key={fac.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-xs dark:border-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{fac.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {fac.title} • {fac.email}
                      </p>
                    </div>
                    <span className="rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300 capitalize">
                      {fac.outreach_status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* 4. Key Dates Tab */}
          {activeTab === 'dates' && (
            <div className="space-y-3">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-xs dark:border-slate-800"
                >
                  <div>
                    <span className="font-semibold capitalize">{m.label}</span>
                    <p className="font-mono text-slate-500 text-[11px]">
                      {m.due_local} ({m.tz})
                    </p>
                  </div>
                  {m.time_assumed && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Time Assumed
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 5. Fees & Waiver Tab */}
          {activeTab === 'fees' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500">Application Fee:</span>
                  <p className="text-sm font-semibold">
                    {app.fee_amount ? `${app.fee_amount} ${app.fee_currency}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Waiver Route:</span>
                  <p className="text-sm font-semibold capitalize">{app.waiver_route}</p>
                </div>
                <div>
                  <span className="text-slate-500">Waiver Status:</span>
                  <p className="text-sm font-semibold capitalize">
                    {app.waiver_status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. Timeline & Notes Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Application Notes & Requirements Log
                </label>
                <textarea
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="mt-2 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Notes
                </button>
              </div>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Status Audit Log
                </h4>
                <div className="space-y-1.5 text-xs">
                  {statusHistory.map((sh) => (
                    <div key={sh.id} className="flex justify-between text-slate-500">
                      <span>Changed to {sh.to_status}</span>
                      <span className="font-mono text-[10px]">{sh.changed_at.slice(0, 16)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. Decision & Offer Tab */}
          {activeTab === 'offer' && (
            <form onSubmit={handleSaveOffer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium">Funding Type</label>
                  <select
                    name="funding_type"
                    defaultValue={offer?.funding_type ?? 'ta'}
                    className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="fellowship">Fellowship</option>
                    <option value="ta">Teaching Assistantship (TA)</option>
                    <option value="ra">Research Assistantship (RA)</option>
                    <option value="mixed">Mixed Funding</option>
                    <option value="none">None / Unfunded</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium">Stipend (USD / Year)</label>
                  <input
                    type="number"
                    name="stipend_amount"
                    defaultValue={offer?.stipend_amount ?? ''}
                    placeholder="e.g. 34000"
                    className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium">Tuition Coverage</label>
                  <select
                    name="tuition"
                    defaultValue={offer?.tuition ?? 'full'}
                    className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="full">Full Tuition Waiver</option>
                    <option value="partial">Partial</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium">Years Guaranteed</label>
                  <input
                    type="number"
                    name="years_guaranteed"
                    defaultValue={offer?.years_guaranteed ?? 5}
                    className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium">
                  CGS April 15 Response Deadline (Prefilled)
                </label>
                <input
                  type="text"
                  name="response_due_local"
                  defaultValue={
                    offer?.response_due_local ?? `${new Date().getFullYear() + 1}-04-15T23:59`
                  }
                  className="mt-1 block w-full rounded border border-slate-300 p-1.5 font-mono dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save Offer Details
              </button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
};
