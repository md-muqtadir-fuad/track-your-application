import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Copy, Mail, Plus, CheckCircle, Clock, Send } from 'lucide-react';
import { DateTime } from 'luxon';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { Modal } from '../ui/Modal';
import type {
  Contact,
  Application,
  University,
  Milestone,
  LetterRequest,
  LetterRequestStatus,
} from '../../lib/db/schema';

export const RecommendersView: React.FC = () => {
  const { repos, version, refresh } = useDatabase();
  const { showToast } = useToast();

  const [recommenders, setRecommenders] = useState<Contact[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [letterRequests, setLetterRequests] = useState<LetterRequest[]>([]);

  // Add recommender modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTitle, setNewTitle] = useState('Professor');
  const [newAffiliation, setNewAffiliation] = useState('');

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [allContacts, allApps, allUnis, allMs, allLr] = await Promise.all([
      repos.contacts.list('recommender'),
      repos.applications.list(),
      repos.universities.list(),
      repos.milestones.listAll(),
      repos.letterRequests.listAll(),
    ]);
    setRecommenders(allContacts);
    setApplications(allApps);
    setUniversities(allUnis);
    setMilestones(allMs);
    setLetterRequests(allLr);
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

  const deadlineMap = useMemo(() => {
    const map = new Map<string, Milestone>();
    for (const m of milestones) {
      if (m.kind === 'application' || !map.has(m.application_id)) {
        map.set(m.application_id, m);
      }
    }
    return map;
  }, [milestones]);

  // Active applications sorted by deadline
  const activeApplications = useMemo(() => {
    return applications
      .filter((a) => !['Accepted', 'Declined', 'Withdrawn', 'Rejected'].includes(a.status))
      .sort((a, b) => {
        const da = deadlineMap.get(a.id)?.due_local ?? '9999';
        const db = deadlineMap.get(b.id)?.due_local ?? '9999';
        return da.localeCompare(db);
      });
  }, [applications, deadlineMap]);

  // Matrix cell lookup: (contact_id, application_id) -> LetterRequest
  const matrix = useMemo(() => {
    const map = new Map<string, LetterRequest>();
    for (const lr of letterRequests) {
      map.set(`${lr.contact_id}:${lr.application_id}`, lr);
    }
    return map;
  }, [letterRequests]);

  const handleCycleStatus = async (contactId: string, appId: string) => {
    if (!repos) return;
    const key = `${contactId}:${appId}`;
    const existing = matrix.get(key);

    const statusOrder: LetterRequestStatus[] = [
      'not_requested',
      'asked',
      'link_sent',
      'submitted',
      'confirmed_received',
    ];

    const currentStatus = existing?.status ?? 'not_requested';
    const nextIdx = (statusOrder.indexOf(currentStatus) + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIdx]!;

    await repos.letterRequests.upsert({
      application_id: appId,
      contact_id: contactId,
      status: nextStatus,
      waived_right_to_view: true,
    });

    refresh();
  };

  const handleCopyReminder = async (rec: Contact) => {
    if (!repos) return;

    // Filter pending applications for this recommender
    const pendingList: Array<{ school: string; program: string; deadline: string }> = [];
    for (const app of activeApplications) {
      const lr = matrix.get(`${rec.id}:${app.id}`);
      if (!lr || (lr.status !== 'submitted' && lr.status !== 'confirmed_received')) {
        const uni = uniMap.get(app.university_id);
        const ms = deadlineMap.get(app.id);
        pendingList.push({
          school: uni?.name ?? 'University',
          program: app.program,
          deadline: ms ? `${ms.due_local} (${ms.tz})` : 'TBD',
        });
      }
    }

    if (pendingList.length === 0) {
      showToast({ message: `All letters from ${rec.name} are already submitted!` });
      return;
    }

    const emailBody = `Dear ${rec.title ? `${rec.title} ` : ''}${rec.name},

I hope you are doing well. I am writing to gently check in regarding the letters of recommendation for my upcoming PhD applications.

Below are the institutions and programs with their deadlines in institution local time:

${pendingList.map((p) => `• ${p.school} — ${p.program}\n  Deadline: ${p.deadline}`).join('\n\n')}

Thank you very much for your generous support and guidance.

Sincerely,
Muqtadir`;

    try {
      await navigator.clipboard.writeText(emailBody);
      showToast({ message: `Reminder email copied to clipboard for ${rec.name}.` });

      // Record last_reminded_on
      const nowIso = DateTime.utc().toISO({ suppressMilliseconds: true })!;
      for (const app of activeApplications) {
        const lr = matrix.get(`${rec.id}:${app.id}`);
        if (lr) {
          await repos.letterRequests.upsert({
            ...lr,
            last_reminded_on: nowIso,
          });
        }
      }
      refresh();
    } catch {
      showToast({ type: 'error', message: 'Failed to copy to clipboard.' });
    }
  };

  const handleOpenMail = (rec: Contact) => {
    const subject = encodeURIComponent('PhD Application Letters of Recommendation - Follow up');
    window.open(`mailto:${rec.email}?subject=${subject}`);
  };

  const handleAddRecommender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos || !newName.trim()) return;

    await repos.contacts.create({
      kind: 'recommender',
      name: newName.trim(),
      email: newEmail.trim(),
      title: newTitle.trim(),
      affiliation: newAffiliation.trim(),
    });

    showToast({ message: `Added recommender ${newName}.` });
    setNewName('');
    setNewEmail('');
    setNewAffiliation('');
    setIsAddModalOpen(false);
    refresh();
  };

  const getStatusChip = (status?: LetterRequestStatus) => {
    switch (status) {
      case 'submitted':
      case 'confirmed_received':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle className="h-3 w-3" />
            Submitted
          </span>
        );
      case 'link_sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
            <Send className="h-3 w-3" />
            Link Sent
          </span>
        );
      case 'asked':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Asked
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Not Requested
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Recommenders Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any cell to cycle status. Use "Copy reminder" to generate a polite consolidated
            request email.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Recommender
        </button>
      </div>

      {/* Recommenders Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-850 px-4 py-3 min-w-[240px]">
                  Recommender
                </th>
                {activeApplications.map((app) => {
                  const uni = uniMap.get(app.university_id);
                  const ms = deadlineMap.get(app.id);
                  return (
                    <th
                      key={app.id}
                      className="px-4 py-3 min-w-[170px] border-l border-slate-200 dark:border-slate-800"
                    >
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {uni?.name}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 font-normal">
                        Due: {ms ? `${ms.due_local.slice(5, 10)} (${ms.tz.split('/')[1]})` : 'TBD'}
                      </p>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recommenders.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeApplications.length + 1}
                    className="py-12 text-center text-slate-400"
                  >
                    No recommenders added yet. Click "Add Recommender" to set up your references.
                  </td>
                </tr>
              ) : (
                recommenders.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      {/* Left sticky column */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 border-r border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              {rec.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {rec.title} • {rec.affiliation}
                            </p>
                            {rec.email && (
                              <p className="font-mono text-[10px] text-slate-400">{rec.email}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => handleCopyReminder(rec)}
                              title="Copy polite reminder email for pending programs"
                              className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {rec.email && (
                              <button
                                type="button"
                                onClick={() => handleOpenMail(rec)}
                                title="Open in mail app"
                                className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Application status cells */}
                      {activeApplications.map((app) => {
                        const lr = matrix.get(`${rec.id}:${app.id}`);
                        return (
                          <td
                            key={app.id}
                            onClick={() => handleCycleStatus(rec.id, app.id)}
                            className="px-4 py-3 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 border-l border-slate-100 dark:border-slate-800/80 transition-colors"
                          >
                            {getStatusChip(lr?.status)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Recommender Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Recommender"
        description="Record a professor or reference who will provide recommendation letters."
        maxWidth="md"
      >
        <form onSubmit={handleAddRecommender} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Ada Placeholder"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. professor@example.edu"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Title
              </label>
              <input
                type="text"
                placeholder="e.g. Associate Professor"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Affiliation / Department
              </label>
              <input
                type="text"
                placeholder="e.g. Department of Computer Science"
                value={newAffiliation}
                onChange={(e) => setNewAffiliation(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Add Recommender
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
