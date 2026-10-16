import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Mail, ExternalLink, Clock, MessageSquare } from 'lucide-react';
import { DateTime } from 'luxon';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { Modal } from '../ui/Modal';
import type { Contact, University, Interaction, OutreachStatus } from '../../lib/db/schema';

export const FacultyView: React.FC = () => {
  const { repos, version, refresh } = useDatabase();
  const { showToast } = useToast();

  const [facultyList, setFacultyList] = useState<Contact[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  // Filter
  const [filterMode, setFilterMode] = useState<'all' | 'due'>('all');

  // Add Faculty Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('Assistant Professor');
  const [affiliation, setAffiliation] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [universityId, setUniversityId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Log Interaction Modal
  const [interactionContact, setInteractionContact] = useState<Contact | null>(null);
  const [interChannel, setInterChannel] = useState<'email' | 'meeting' | 'call' | 'other'>('email');
  const [interDirection, setInterDirection] = useState<'sent' | 'received'>('sent');
  const [interSummary, setInterSummary] = useState('');
  const [interDate, setInterDate] = useState(DateTime.now().toISO()?.slice(0, 16) ?? '');
  const [interFollowUp, setInterFollowUp] = useState(
    DateTime.now().plus({ days: 10 }).toISO()?.slice(0, 16) ?? '',
  );
  const [newOutreachStatus, setNewOutreachStatus] = useState<OutreachStatus>('emailed');

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [fac, unis, inters] = await Promise.all([
      repos.contacts.list('faculty'),
      repos.universities.list(),
      repos.interactions.listRecent(100),
    ]);
    setFacultyList(fac);
    setUniversities(unis);
    setInteractions(inters);
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

  const now = DateTime.now();

  const filteredFaculty = useMemo(() => {
    if (filterMode === 'all') return facultyList;
    return facultyList.filter((f) => {
      if (!f.next_follow_up_on) return false;
      const dt = DateTime.fromISO(f.next_follow_up_on);
      return dt <= now.plus({ days: 1 });
    });
  }, [facultyList, filterMode, now]);

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos || !name.trim()) return;

    await repos.contacts.create({
      kind: 'faculty',
      name: name.trim(),
      title: title.trim(),
      affiliation: affiliation.trim(),
      email: email.trim(),
      website: website.trim(),
      university_id: universityId || null,
      outreach_status: 'not_contacted',
      notes: notes.trim(),
    });

    showToast({ message: `Added faculty member ${name}.` });
    setName('');
    setEmail('');
    setAffiliation('');
    setWebsite('');
    setNotes('');
    setIsAddModalOpen(false);
    refresh();
  };

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos || !interactionContact || !interSummary.trim()) return;

    await repos.interactions.create({
      contact_id: interactionContact.id,
      occurred_on: interDate,
      channel: interChannel,
      direction: interDirection,
      summary: interSummary.trim(),
      follow_up_on: interFollowUp || null,
    });

    await repos.contacts.update(interactionContact.id, {
      outreach_status: newOutreachStatus,
      next_follow_up_on: interFollowUp || null,
    });

    showToast({ message: `Logged ${interChannel} with ${interactionContact.name}.` });
    setInteractionContact(null);
    setInterSummary('');
    refresh();
  };

  const getStatusBadge = (status: OutreachStatus) => {
    const config: Record<OutreachStatus, { label: string; bg: string; text: string }> = {
      not_contacted: {
        label: 'Not Contacted',
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
      },
      emailed: {
        label: 'Emailed',
        bg: 'bg-blue-50 dark:bg-blue-950/80',
        text: 'text-blue-700 dark:text-blue-300',
      },
      replied_positive: {
        label: 'Replied: Positive',
        bg: 'bg-emerald-50 dark:bg-emerald-950/80',
        text: 'text-emerald-800 dark:text-emerald-300',
      },
      replied_neutral: {
        label: 'Replied: Neutral',
        bg: 'bg-amber-50 dark:bg-amber-950/80',
        text: 'text-amber-800 dark:text-amber-300',
      },
      replied_no: {
        label: 'Replied: No Openings',
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
      },
      meeting_set: {
        label: 'Meeting Set',
        bg: 'bg-purple-50 dark:bg-purple-950/80',
        text: 'text-purple-700 dark:text-purple-300',
      },
      met: {
        label: 'Met',
        bg: 'bg-emerald-50 dark:bg-emerald-950/80',
        text: 'text-emerald-800 dark:text-emerald-300',
      },
    };
    const c = config[status] ?? config.not_contacted;
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Faculty ({facultyList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('due')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                filterMode === 'due'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Follow-ups Due
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Faculty Contact
        </button>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFaculty.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
            No faculty contacts found in this view.
          </div>
        ) : (
          filteredFaculty.map((fac) => {
            const uni = fac.university_id ? uniMap.get(fac.university_id) : null;
            const facInteractions = interactions.filter((i) => i.contact_id === fac.id);
            const latestInteraction = facInteractions[0];
            const isFollowUpDue =
              fac.next_follow_up_on && DateTime.fromISO(fac.next_follow_up_on) <= now;

            return (
              <div
                key={fac.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {fac.name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {fac.title} • {fac.affiliation}
                      </p>
                      {uni && (
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                          {uni.name} ({uni.city})
                        </p>
                      )}
                    </div>
                    {getStatusBadge(fac.outreach_status)}
                  </div>

                  {/* Links & Email */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {fac.email && (
                      <a
                        href={`mailto:${fac.email}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-mono"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {fac.email}
                      </a>
                    )}
                    {fac.website && (
                      <a
                        href={fac.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Homepage
                      </a>
                    )}
                  </div>

                  {/* Notes / Research topics */}
                  {fac.notes && (
                    <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 whitespace-pre-line">
                      {fac.notes}
                    </div>
                  )}

                  {/* Latest Interaction & Follow-up date */}
                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
                    {latestInteraction && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="line-clamp-1">{latestInteraction.summary}</span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          ({latestInteraction.occurred_on.slice(0, 10)})
                        </span>
                      </div>
                    )}

                    {fac.next_follow_up_on && (
                      <div
                        className={`flex items-center gap-1.5 font-medium ${
                          isFollowUpDue
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Follow-up: {fac.next_follow_up_on.replace('T', ' ').slice(0, 16)}
                          {isFollowUpDue ? ' (DUE NOW)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom action */}
                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setInteractionContact(fac);
                      setNewOutreachStatus(fac.outreach_status);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Log Email / Interaction
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Faculty Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Faculty Contact"
        description="Record a professor, potential advisor, or faculty member to contact."
        maxWidth="lg"
      >
        <form onSubmit={handleAddFaculty} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Professor Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Md Abdul Quddus, PhD"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                placeholder="e.g. Assistant Professor"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Department / Program
              </label>
              <input
                type="text"
                placeholder="e.g. Textile Engineering, Chemistry and Science"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              University
            </label>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Select University (optional)</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. mquddus@ncsu.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Homepage / Google Scholar
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Research Topics & Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. multiagent systems, game-theoretical learning..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
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
              Save Contact
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Interaction Modal */}
      {interactionContact && (
        <Modal
          isOpen={Boolean(interactionContact)}
          onClose={() => setInteractionContact(null)}
          title={`Log Interaction: ${interactionContact.name}`}
          description="Record an email sent, meeting held, or response received, and schedule a follow-up."
          maxWidth="md"
        >
          <form onSubmit={handleLogInteraction} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold">Channel</label>
                <select
                  value={interChannel}
                  onChange={(e) =>
                    setInterChannel(e.target.value as 'email' | 'meeting' | 'call' | 'other')
                  }
                  className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="email">Email</option>
                  <option value="meeting">Meeting / Zoom</option>
                  <option value="call">Phone Call</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold">Direction</label>
                <select
                  value={interDirection}
                  onChange={(e) => setInterDirection(e.target.value as 'sent' | 'received')}
                  className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="sent">Sent by me</option>
                  <option value="received">Received from faculty</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold">Summary / Outcome *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Sent prospective PhD inquiry regarding research and openings..."
                value={interSummary}
                onChange={(e) => setInterSummary(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold">Occurred On</label>
                <input
                  type="datetime-local"
                  required
                  value={interDate}
                  onChange={(e) => setInterDate(e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-300 p-1.5 font-mono dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold">Schedule Follow-up</label>
                <input
                  type="datetime-local"
                  value={interFollowUp}
                  onChange={(e) => setInterFollowUp(e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-300 p-1.5 font-mono dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold">Update Outreach Status</label>
              <select
                value={newOutreachStatus}
                onChange={(e) => setNewOutreachStatus(e.target.value as OutreachStatus)}
                className="mt-1 block w-full rounded border border-slate-300 p-1.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="emailed">Emailed (Awaiting reply)</option>
                <option value="replied_positive">Replied: Positive</option>
                <option value="replied_neutral">Replied: Neutral</option>
                <option value="replied_no">Replied: No Openings</option>
                <option value="meeting_set">Meeting Set</option>
                <option value="met">Met</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInteractionContact(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700"
              >
                Save Interaction
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
