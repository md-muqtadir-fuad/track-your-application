import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { createApplicationWithDefaults } from '../../lib/services/application-service';
import { PINNED_US_TIMEZONES } from '../../lib/time';
import type { University } from '../../lib/db/schema';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (applicationId: string) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { repos, refresh } = useDatabase();
  const { showToast } = useToast();

  const [universities, setUniversities] = useState<University[]>([]);
  const [universityInput, setUniversityInput] = useState('');
  const [selectedUniId, setSelectedUniId] = useState<string | null>(null);
  const [newUniTz, setNewUniTz] = useState('America/New_York');

  const [program, setProgram] = useState('');
  const [degree, setDegree] = useState<'phd' | 'ms' | 'other'>('phd');
  const [term, setTerm] = useState('Fall 2027');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repos || !isOpen) return;
    repos.universities.list().then(setUniversities).catch(console.error);
  }, [repos, isOpen]);

  const matchingUnis = universities.filter((u) =>
    u.name.toLowerCase().includes(universityInput.toLowerCase().trim()),
  );
  const isExistingMatch = universities.some(
    (u) => u.name.toLowerCase() === universityInput.toLowerCase().trim(),
  );
  const isNewUniversity = universityInput.trim().length > 0 && !isExistingMatch;

  const handleSelectUni = (uni: University) => {
    setSelectedUniId(uni.id);
    setUniversityInput(uni.name);
    setNewUniTz(uni.tz);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos) return;

    if (!universityInput.trim()) {
      setError('Please provide a university name.');
      return;
    }
    if (!program.trim()) {
      setError('Please provide a program name.');
      return;
    }
    if (!deadlineDate.trim()) {
      setError('Please select a deadline date.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { application } = await createApplicationWithDefaults(repos, {
        university_id: selectedUniId ?? undefined,
        university_name: universityInput.trim(),
        university_tz: newUniTz,
        program: program.trim(),
        degree,
        term: term.trim(),
        deadline_date: deadlineDate,
        deadline_time: deadlineTime.trim() || undefined,
        priority,
      });

      refresh();
      showToast({
        type: 'success',
        message: `Created application for ${program} at ${universityInput}.`,
      });

      // Reset
      setUniversityInput('');
      setSelectedUniId(null);
      setProgram('');
      setDeadlineDate('');
      setDeadlineTime('');
      setPriority(1);
      onClose();
      onSuccess?.(application.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Application"
      description="Quickly record a new program application. Default checklist and recommenders will be attached."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="border border-[#8E1616] bg-[#F8EEDF] p-3 text-xs text-[#8E1616] font-mono">
            {error}
          </div>
        )}

        {/* University Name & Autocomplete */}
        <div className="relative">
          <label className="block text-xs font-semibold text-[#000000]">University *</label>
          <input
            type="text"
            required
            placeholder="e.g. NC State University, UC Berkeley..."
            value={universityInput}
            onChange={(e) => {
              setUniversityInput(e.target.value);
              setSelectedUniId(null);
            }}
            className="mt-1 block w-full rounded-none border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
          />

          {/* Autocomplete dropdown */}
          {!selectedUniId && universityInput && matchingUnis.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-none border border-[#000000]/30 bg-[#F8EEDF] py-1 shadow-lg">
              {matchingUnis.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUni(u)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#E8C999]/40 text-[#000000]"
                >
                  <span className="font-serif font-bold text-[#000000]">{u.name}</span>
                  <span className="text-[10px] text-[#000000]/60 font-mono">{u.tz}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time Zone picker for new university */}
        {isNewUniversity && (
          <div className="rounded-none border border-[#E8C999] bg-[#E8C999]/20 p-3">
            <label className="block text-xs font-semibold text-[#8E1616]">
              Institution Time Zone *
            </label>
            <p className="mt-0.5 text-[11px] text-[#000000]/70 font-serif">
              Deadlines are locked to the school's local wall-clock zone.
            </p>
            <select
              value={newUniTz}
              onChange={(e) => setNewUniTz(e.target.value)}
              className="mt-2 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-1.5 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
            >
              <optgroup label="Pinned US Time Zones">
                {PINNED_US_TIMEZONES.map((tz) => (
                  <option key={tz.zone} value={tz.zone}>
                    {tz.label} ({tz.zone})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Global Zones">
                <option value="Asia/Dhaka">Bangladesh (Asia/Dhaka)</option>
                <option value="Europe/London">UK (Europe/London)</option>
                <option value="Europe/Berlin">Central Europe (Europe/Berlin)</option>
                <option value="Asia/Tokyo">Japan (Asia/Tokyo)</option>
                <option value="Australia/Sydney">Sydney (Australia/Sydney)</option>
              </optgroup>
            </select>
          </div>
        )}

        {/* Program Name */}
        <div>
          <label className="block text-xs font-semibold text-[#000000]">Program *</label>
          <input
            type="text"
            required
            placeholder="e.g. PhD in Textile Engineering, PhD in Computer Science..."
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
          />
        </div>

        {/* Degree & Term */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#000000]">Degree</label>
            <select
              value={degree}
              onChange={(e) => setDegree(e.target.value as 'phd' | 'ms' | 'other')}
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
            >
              <option value="phd">PhD</option>
              <option value="ms">MS / Master's</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#000000]">Term</label>
            <input
              type="text"
              placeholder="e.g. Fall 2027"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs font-mono text-[#000000] focus:border-[#8E1616] focus:outline-none"
            />
          </div>
        </div>

        {/* Deadline Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#000000]">Deadline Date *</label>
            <input
              type="date"
              required
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs text-[#000000] font-mono focus:border-[#8E1616] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#000000]">
              School Time (optional)
            </label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              placeholder="23:59"
              className="mt-1 block w-full border border-[#000000]/25 bg-[#F8EEDF] px-3 py-2 text-xs text-[#000000] font-mono focus:border-[#8E1616] focus:outline-none"
            />
            <span className="text-[10px] font-mono text-[#000000]/50">
              Defaults to 23:59 if blank.
            </span>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-semibold text-[#000000]">Priority</label>
          <div className="mt-1 flex gap-4 text-xs font-mono">
            {[
              { val: 1, label: 'High (Tier 1)' },
              { val: 2, label: 'Medium (Tier 2)' },
              { val: 3, label: 'Standard (Tier 3)' },
            ].map((p) => (
              <label key={p.val} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  checked={priority === p.val}
                  onChange={() => setPriority(p.val as 1 | 2 | 3)}
                  className="accent-[#8E1616]"
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#000000]/15 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#000000]/25 bg-[#F8EEDF] px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#000000] hover:bg-[#E8C999]/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#8E1616] px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616] disabled:opacity-50"
          >
            {isSubmitting ? 'Recording...' : 'Record Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
