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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#000000]/15 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#000000]/60">Status:</span>
            <select
              value={app.status}
              onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
              className="border border-[#000000]/25 bg-[#F8EEDF] px-2 py-1 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
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
                className="inline-flex items-center gap-1 text-xs text-[#8E1616] hover:underline font-mono"
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
                className="inline-flex items-center gap-1 text-xs text-[#000000]/70 hover:text-[#8E1616] font-mono"
              >
                <ExternalLink className="h-3 w-3" />
                Program Page
              </a>
            )}
          </div>
        </div>

        {waiverWarning && (
          <div className="flex items-center gap-2 border border-[#8E1616]/40 bg-[#E8C999]/30 p-3 text-xs text-[#8E1616] font-mono">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#8E1616]" />
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
            <div className="border border-dashed border-[#000000]/25 p-3 text-xs font-serif italic text-[#000000]/50 bg-white/40">
              No application deadline milestone recorded.
            </div>
          )}

          <div className="border border-[#000000]/20 bg-white p-3 flex flex-col justify-center">
            <ProgressBar value={readiness} size="md" />
            <p className="mt-1 text-[11px] font-mono text-[#000000]/60">
              {readiness}% requirements completed
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#000000]/15 text-xs overflow-x-auto">
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
              className={`px-3 py-2 font-medium border-b-2 transition-colors -mb-px whitespace-nowrap text-xs font-mono uppercase tracking-wider ${
                activeTab === tab.id
                  ? 'border-[#8E1616] text-[#8E1616] font-bold'
                  : 'border-transparent text-[#000000]/60 hover:text-[#000000]'
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
                  className="flex-1 rounded-none border border-[#000000]/25 bg-[#F8EEDF] px-3 py-1.5 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-none bg-[#8E1616] px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </form>

              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-none border border-[#000000]/15 bg-[#E8C999]/15 p-2 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={item.status === 'done'}
                        onChange={() => handleToggleChecklist(item)}
                        className="h-4 w-4 rounded-none border-[#000000]/30 accent-[#8E1616]"
                      />
                      <span
                        className={
                          item.status === 'done'
                            ? 'line-through text-[#000000]/40 font-mono'
                            : 'font-serif text-[#000000] font-medium'
                        }
                      >
                        {item.label}
                      </span>
                    </label>

                    <div className="flex items-center gap-3">
                      {item.status === 'not_required' ? (
                        <span className="border border-[#000000]/20 bg-[#F8EEDF] px-1.5 py-0.5 text-[10px] font-mono text-[#000000]/70">
                          Not Required
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="text-[#000000]/40 hover:text-[#8E1616] p-1"
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
              <p className="text-xs font-serif text-[#000000]/70">
                Letters are requested per institution. Some portals do not allow changing
                recommenders after submission.
              </p>
              <div className="space-y-3">
                {letters.map((req) => {
                  const contact = contacts.find((c) => c.id === req.contact_id);
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between border border-[#000000]/15 bg-white p-3 text-xs"
                    >
                      <div>
                        <p className="font-serif font-bold text-[#000000]">
                          {contact ? contact.name : 'Unknown Recommender'}
                        </p>
                        <p className="text-[11px] font-mono text-[#000000]/60">
                          {contact?.email} • {contact?.affiliation}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={req.status}
                          onChange={(e) =>
                            handleLetterStatusChange(req.id, e.target.value as LetterRequestStatus)
                          }
                          className="border border-[#000000]/25 bg-[#F8EEDF] px-2 py-1 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
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
              <div className="border border-[#000000]/15 bg-[#F8EEDF] p-3 text-xs">
                <span className="font-serif font-bold text-[#000000]">Faculty Contact Policy:</span>{' '}
                <span className="capitalize font-mono">{app.faculty_contact_policy}</span>
              </div>
              <p className="text-xs font-serif text-[#000000]/70">
                Review outreach interactions and prospective advisors linked to this department.
              </p>
              {contacts
                .filter((c) => c.kind === 'faculty' && c.university_id === uni.id)
                .map((fac) => (
                  <div
                    key={fac.id}
                    className="flex items-center justify-between border border-[#000000]/15 bg-white p-3 text-xs"
                  >
                    <div>
                      <p className="font-serif font-bold text-[#000000]">{fac.name}</p>
                      <p className="text-[11px] font-mono text-[#000000]/60">
                        {fac.title} • {fac.email}
                      </p>
                    </div>
                    <span
                      className={`border px-2 py-0.5 text-[10px] font-mono font-bold capitalize ${
                        fac.outreach_status === 'not_contacted'
                          ? 'border-[#8E1616] border-dashed bg-[#F8EEDF] text-[#8E1616]'
                          : 'border-[#8E1616]/40 bg-[#E8C999]/30 text-[#8E1616]'
                      }`}
                    >
                      {fac.outreach_status === 'not_contacted'
                        ? 'Not Mailed Yet'
                        : fac.outreach_status.replace('_', ' ')}
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
                  className="flex items-center justify-between border border-[#000000]/15 bg-white p-3 text-xs"
                >
                  <div>
                    <span className="font-serif font-bold text-[#000000] capitalize">
                      {m.label}
                    </span>
                    <p className="font-mono text-[#000000]/60 text-[11px]">
                      {m.due_local} ({m.tz})
                    </p>
                  </div>
                  {m.time_assumed && (
                    <span className="border border-[#8E1616]/40 bg-[#E8C999]/30 px-1.5 py-0.5 text-[10px] font-mono text-[#8E1616]">
                      Time Assumed
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 5. Fees & Waiver Tab */}
          {activeTab === 'fees' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#000000]/15 bg-[#F8EEDF] p-3">
                  <span className="text-[#000000]/60">Application Fee:</span>
                  <p className="text-sm font-bold text-[#000000]">
                    {app.fee_amount ? `${app.fee_amount} ${app.fee_currency}` : 'Not set'}
                  </p>
                </div>
                <div className="border border-[#000000]/15 bg-[#F8EEDF] p-3">
                  <span className="text-[#000000]/60">Waiver Route:</span>
                  <p className="text-sm font-bold text-[#000000] capitalize">{app.waiver_route}</p>
                </div>
                <div className="border border-[#000000]/15 bg-[#F8EEDF] p-3">
                  <span className="text-[#000000]/60">Waiver Status:</span>
                  <p className="text-sm font-bold text-[#8E1616] capitalize">
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
                <label className="block text-xs font-semibold text-[#000000]">
                  Application Notes & Requirements Log
                </label>
                <textarea
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-2.5 text-xs font-serif text-[#000000] focus:border-[#8E1616] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="mt-2 bg-[#8E1616] px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616]"
                >
                  Save Notes
                </button>
              </div>

              <div className="border-t border-[#000000]/15 pt-3">
                <h4 className="text-xs font-serif font-bold text-[#000000] mb-2">
                  Status Audit Log
                </h4>
                <div className="space-y-1.5 text-xs font-mono">
                  {statusHistory.map((sh) => (
                    <div key={sh.id} className="flex justify-between text-[#000000]/70">
                      <span>Changed to {sh.to_status}</span>
                      <span className="text-[10px] text-[#000000]/50">
                        {sh.changed_at.slice(0, 16)}
                      </span>
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
                  <label className="block font-semibold text-[#000000]">Funding Type</label>
                  <select
                    name="funding_type"
                    defaultValue={offer?.funding_type ?? 'ta'}
                    className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                  >
                    <option value="fellowship">Fellowship</option>
                    <option value="ta">Teaching Assistantship (TA)</option>
                    <option value="ra">Research Assistantship (RA)</option>
                    <option value="mixed">Mixed Funding</option>
                    <option value="none">None / Unfunded</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#000000]">Stipend (USD / Year)</label>
                  <input
                    type="number"
                    name="stipend_amount"
                    defaultValue={offer?.stipend_amount ?? ''}
                    placeholder="e.g. 34000"
                    className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#000000]">Tuition Coverage</label>
                  <select
                    name="tuition"
                    defaultValue={offer?.tuition ?? 'full'}
                    className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                  >
                    <option value="full">Full Tuition Waiver</option>
                    <option value="partial">Partial</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#000000]">Years Guaranteed</label>
                  <input
                    type="number"
                    name="years_guaranteed"
                    defaultValue={offer?.years_guaranteed ?? 5}
                    className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#000000]">
                  CGS April 15 Response Deadline (Prefilled)
                </label>
                <input
                  type="text"
                  name="response_due_local"
                  defaultValue={
                    offer?.response_due_local ?? `${new Date().getFullYear() + 1}-04-15T23:59`
                  }
                  className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-3 bg-[#8E1616] px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616]"
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
