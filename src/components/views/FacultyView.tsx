import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Mail, ExternalLink, Clock, MessageSquare, Send } from 'lucide-react';
import { DateTime } from 'luxon';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { Modal } from '../ui/Modal';
import type { Contact, University, Interaction, OutreachStatus } from '../../lib/db/schema';

type FacultyFilterMode = 'all' | 'not_mailed' | 'emailed' | 'due';

export const FacultyView: React.FC = () => {
  const { repos, version, refresh } = useDatabase();
  const { showToast } = useToast();

  const [facultyList, setFacultyList] = useState<Contact[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  // Filter
  const [filterMode, setFilterMode] = useState<FacultyFilterMode>('all');

  // Add Faculty Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('Assistant Professor');
  const [affiliation, setAffiliation] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [universityId, setUniversityId] = useState<string>('');
  const [addOutreachStatus, setAddOutreachStatus] = useState<OutreachStatus>('not_contacted');
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

  const notMailedCount = useMemo(
    () => facultyList.filter((f) => f.outreach_status === 'not_contacted').length,
    [facultyList],
  );

  const emailedCount = useMemo(
    () => facultyList.filter((f) => f.outreach_status !== 'not_contacted').length,
    [facultyList],
  );

  const dueCount = useMemo(
    () =>
      facultyList.filter((f) => {
        if (!f.next_follow_up_on) return false;
        const dt = DateTime.fromISO(f.next_follow_up_on);
        return dt <= now.plus({ days: 1 });
      }).length,
    [facultyList, now],
  );

  const filteredFaculty = useMemo(() => {
    if (filterMode === 'all') return facultyList;
    if (filterMode === 'not_mailed') {
      return facultyList.filter((f) => f.outreach_status === 'not_contacted');
    }
    if (filterMode === 'emailed') {
      return facultyList.filter((f) => f.outreach_status !== 'not_contacted');
    }
    if (filterMode === 'due') {
      return facultyList.filter((f) => {
        if (!f.next_follow_up_on) return false;
        const dt = DateTime.fromISO(f.next_follow_up_on);
        return dt <= now.plus({ days: 1 });
      });
    }
    return facultyList;
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
      outreach_status: addOutreachStatus,
      notes: notes.trim(),
    });

    showToast({
      message: `Added faculty member ${name} (${
        addOutreachStatus === 'not_contacted'
          ? 'Not Mailed Yet'
          : addOutreachStatus.replace('_', ' ')
      }).`,
    });
    setName('');
    setEmail('');
    setAffiliation('');
    setWebsite('');
    setNotes('');
    setAddOutreachStatus('not_contacted');
    setIsAddModalOpen(false);
    refresh();
  };

  const handleQuickStatusChange = async (contactId: string, status: OutreachStatus) => {
    if (!repos) return;
    await repos.contacts.update(contactId, {
      outreach_status: status,
    });
    showToast({
      message: `Status updated to ${
        status === 'not_contacted' ? 'Not Mailed Yet' : status.replace('_', ' ')
      }.`,
    });
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
        label: 'NOT MAILED YET',
        bg: 'bg-[#F8EEDF] border-2 border-[#8E1616] border-dashed',
        text: 'text-[#8E1616] font-mono font-bold tracking-wider',
      },
      emailed: {
        label: 'Emailed',
        bg: 'bg-[#E8C999]/30 border border-[#8E1616]/40',
        text: 'text-[#8E1616] font-mono font-bold',
      },
      replied_positive: {
        label: 'Replied: Positive',
        bg: 'bg-[#8E1616] border border-[#8E1616]',
        text: 'text-[#F8EEDF] font-mono font-bold',
      },
      replied_neutral: {
        label: 'Replied: Neutral',
        bg: 'bg-[#E8C999] border border-[#000000]/30',
        text: 'text-[#000000] font-mono font-semibold',
      },
      replied_no: {
        label: 'Replied: No Openings',
        bg: 'bg-transparent border border-[#000000]/20 line-through',
        text: 'text-[#000000]/40 font-mono',
      },
      meeting_set: {
        label: 'Meeting Set',
        bg: 'bg-[#8E1616]/15 border border-[#8E1616]',
        text: 'text-[#8E1616] font-mono font-bold',
      },
      met: {
        label: 'Met',
        bg: 'bg-[#000000] border border-[#000000]',
        text: 'text-[#F8EEDF] font-mono font-bold',
      },
    };
    const c = config[status] ?? config.not_contacted;
    return (
      <span className={`rounded-none px-2.5 py-0.5 text-xs ${c.bg} ${c.text}`}>{c.label}</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap rounded-none border border-[#000000]/25 bg-[#F8EEDF] p-0.5 text-xs font-mono uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-none px-3 py-1.5 transition-colors ${
                filterMode === 'all'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              All Faculty ({facultyList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('not_mailed')}
              className={`rounded-none px-3 py-1.5 transition-colors ${
                filterMode === 'not_mailed'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              Not Mailed Yet ({notMailedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('emailed')}
              className={`rounded-none px-3 py-1.5 transition-colors ${
                filterMode === 'emailed'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              Outreach Active ({emailedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('due')}
              className={`rounded-none px-3 py-1.5 transition-colors ${
                filterMode === 'due'
                  ? 'bg-[#8E1616] text-[#F8EEDF] font-bold shadow-xs'
                  : 'text-[#000000]/70 hover:text-[#000000]'
              }`}
            >
              Follow-ups Due ({dueCount})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-none bg-[#8E1616] px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Faculty Contact
        </button>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFaculty.length === 0 ? (
          <div className="col-span-2 border border-dashed border-[#000000]/25 p-12 text-center text-xs font-serif italic text-[#000000]/60 bg-white/40">
            {filterMode === 'not_mailed'
              ? 'No uncontacted faculty. You have mailed everyone on your prospective advisor list!'
              : filterMode === 'due'
                ? 'No follow-ups currently due. Great job keeping up with outreach!'
                : filterMode === 'emailed'
                  ? 'No active outreach yet. Select "Not Mailed Yet" to view prospective faculty to contact.'
                  : 'No faculty contacts found in this view. Click "Add Faculty Contact" to add prospective advisors.'}
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
                className="flex flex-col justify-between border border-[#000000]/20 bg-white p-5 shadow-xs text-[#000000]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-serif text-base font-bold text-[#000000]">{fac.name}</h4>
                      <p className="text-xs font-mono text-[#000000]/70">
                        {fac.title} • {fac.affiliation}
                      </p>
                      {uni && (
                        <p className="text-xs font-serif font-bold text-[#8E1616] mt-0.5">
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
                        className="inline-flex items-center gap-1 text-[#000000]/70 hover:text-[#8E1616] font-mono"
                      >
                        <Mail className="h-3.5 w-3.5 text-[#8E1616]" />
                        {fac.email}
                      </a>
                    )}
                    {fac.website && (
                      <a
                        href={fac.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#000000]/70 hover:text-[#8E1616] font-mono"
                      >
                        <ExternalLink className="h-3 w-3 text-[#8E1616]" />
                        Homepage
                      </a>
                    )}
                  </div>

                  {/* Notes / Research topics */}
                  {fac.notes && (
                    <div className="mt-3 border border-[#000000]/15 bg-[#E8C999]/15 p-2.5 text-xs text-[#000000]/80 whitespace-pre-line font-serif">
                      {fac.notes}
                    </div>
                  )}

                  {/* Latest Interaction & Follow-up date */}
                  <div className="mt-4 space-y-1.5 border-t border-[#000000]/10 pt-3 text-xs">
                    {latestInteraction ? (
                      <div className="flex items-center gap-1.5 text-[#000000]/80">
                        <MessageSquare className="h-3.5 w-3.5 text-[#8E1616] shrink-0" />
                        <span className="line-clamp-1">{latestInteraction.summary}</span>
                        <span className="font-mono text-[10px] text-[#000000]/50 shrink-0">
                          ({latestInteraction.occurred_on.slice(0, 10)})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8E1616]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#8E1616] animate-pulse shrink-0" />
                        <span>Not mailed yet — awaiting prospective inquiry email</span>
                      </div>
                    )}

                    {fac.next_follow_up_on && (
                      <div
                        className={`flex items-center gap-1.5 font-mono text-xs ${
                          isFollowUpDue ? 'text-[#8E1616] font-bold' : 'text-[#000000]/80'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 text-[#8E1616] shrink-0" />
                        <span>
                          Follow-up: {fac.next_follow_up_on.replace('T', ' ').slice(0, 16)}
                          {isFollowUpDue ? ' (DUE NOW)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom actions & Inline status selector */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#000000]/10 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#000000]/60">
                      Status:
                    </span>
                    <select
                      value={fac.outreach_status}
                      onChange={(e) =>
                        handleQuickStatusChange(fac.id, e.target.value as OutreachStatus)
                      }
                      className="border border-[#000000]/25 bg-[#F8EEDF] px-2 py-1 text-xs font-mono font-medium text-[#000000] focus:border-[#8E1616] focus:outline-none"
                    >
                      <option value="not_contacted">Not Mailed Yet</option>
                      <option value="emailed">Emailed (Sent)</option>
                      <option value="replied_positive">Replied: Positive</option>
                      <option value="replied_neutral">Replied: Neutral</option>
                      <option value="replied_no">Replied: No Openings</option>
                      <option value="meeting_set">Meeting Set</option>
                      <option value="met">Met</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {fac.email && fac.outreach_status === 'not_contacted' && (
                      <a
                        href={`mailto:${fac.email}?subject=${encodeURIComponent(
                          `Prospective PhD Inquiry - ${uni ? uni.name : 'Research Lab'}`,
                        )}`}
                        className="inline-flex items-center gap-1 border border-[#000000]/25 bg-[#F8EEDF] px-2.5 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#8E1616] hover:bg-[#E8C999]/40 hover:border-[#8E1616] transition-colors"
                        title="Draft email in default mail client"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Draft Mail
                      </a>
                    )}

                    {fac.outreach_status === 'not_contacted' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setInteractionContact(fac);
                          setNewOutreachStatus('emailed');
                          setInterDirection('sent');
                          setInterChannel('email');
                          setInterSummary(`Sent initial inquiry email to ${fac.name}.`);
                        }}
                        className="inline-flex items-center gap-1 border border-[#8E1616] bg-[#8E1616] px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Log Initial Mail
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setInteractionContact(fac);
                          setNewOutreachStatus(fac.outreach_status);
                          setInterSummary('');
                        }}
                        className="inline-flex items-center gap-1 border border-[#000000]/25 bg-[#F8EEDF] px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#000000] hover:bg-[#E8C999]/40 hover:border-[#8E1616] transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#8E1616]" />
                        Log Interaction
                      </button>
                    )}
                  </div>
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
        <form onSubmit={handleAddFaculty} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#000000]">Professor Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Md Abdul Quddus, PhD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#000000]">Title</label>
              <input
                type="text"
                placeholder="e.g. Assistant Professor"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#000000]">Department / Program</label>
              <input
                type="text"
                placeholder="e.g. Textile Engineering, Chemistry and Science"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#000000]">University</label>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
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
              <label className="block font-semibold text-[#000000]">Email Address</label>
              <input
                type="email"
                placeholder="e.g. mquddus@ncsu.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#000000]">
                Homepage / Google Scholar
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#000000]">Research Topics & Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. multiagent systems, game-theoretical learning..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-2 text-xs font-serif text-[#000000] focus:border-[#8E1616] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#000000]">Initial Outreach Status</label>
            <select
              value={addOutreachStatus}
              onChange={(e) => setAddOutreachStatus(e.target.value as OutreachStatus)}
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
            >
              <option value="not_contacted">Not Mailed Yet (To Contact)</option>
              <option value="emailed">Emailed (Already Sent)</option>
              <option value="replied_positive">Replied: Positive</option>
              <option value="replied_neutral">Replied: Neutral</option>
              <option value="replied_no">Replied: No Openings</option>
              <option value="meeting_set">Meeting Set</option>
              <option value="met">Met</option>
            </select>
            <p className="mt-1 text-[11px] font-serif text-[#000000]/60">
              Default is &quot;Not Mailed Yet&quot; for newly researched prospective advisors.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#000000]/15">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="border border-[#000000]/25 bg-[#F8EEDF] px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#000000] hover:bg-[#E8C999]/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#8E1616] px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616]"
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
                <label className="block font-semibold text-[#000000]">Channel</label>
                <select
                  value={interChannel}
                  onChange={(e) =>
                    setInterChannel(e.target.value as 'email' | 'meeting' | 'call' | 'other')
                  }
                  className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                >
                  <option value="email">Email</option>
                  <option value="meeting">Meeting / Zoom</option>
                  <option value="call">Phone Call</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#000000]">Direction</label>
                <select
                  value={interDirection}
                  onChange={(e) => setInterDirection(e.target.value as 'sent' | 'received')}
                  className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                >
                  <option value="sent">Sent by me</option>
                  <option value="received">Received from faculty</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#000000]">Summary / Outcome *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Sent prospective PhD inquiry regarding research and openings..."
                value={interSummary}
                onChange={(e) => setInterSummary(e.target.value)}
                className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-2 text-xs font-serif text-[#000000] focus:border-[#8E1616] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#000000]">Occurred On</label>
                <input
                  type="datetime-local"
                  required
                  value={interDate}
                  onChange={(e) => setInterDate(e.target.value)}
                  className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#000000]">Schedule Follow-up</label>
                <input
                  type="datetime-local"
                  value={interFollowUp}
                  onChange={(e) => setInterFollowUp(e.target.value)}
                  className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#000000]">Update Outreach Status</label>
              <select
                value={newOutreachStatus}
                onChange={(e) => setNewOutreachStatus(e.target.value as OutreachStatus)}
                className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] p-1.5 font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
              >
                <option value="not_contacted">Not Mailed Yet (Reset status)</option>
                <option value="emailed">Emailed (Awaiting reply)</option>
                <option value="replied_positive">Replied: Positive</option>
                <option value="replied_neutral">Replied: Neutral</option>
                <option value="replied_no">Replied: No Openings</option>
                <option value="meeting_set">Meeting Set</option>
                <option value="met">Met</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#000000]/15">
              <button
                type="button"
                onClick={() => setInteractionContact(null)}
                className="border border-[#000000]/25 bg-[#F8EEDF] px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#000000] hover:bg-[#E8C999]/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#8E1616] px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616]"
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
