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
          <div className="rounded-md bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* University Name & Autocomplete */}
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            University *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. NC State University, UC Berkeley..."
            value={universityInput}
            onChange={(e) => {
              setUniversityInput(e.target.value);
              setSelectedUniId(null);
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          {/* Autocomplete dropdown */}
          {!selectedUniId && universityInput && matchingUnis.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {matchingUnis.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUni(u)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{u.name}</span>
                  <span className="text-[10px] text-slate-400">{u.tz}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time Zone picker for new university */}
        {isNewUniversity && (
          <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Institution Time Zone *
            </label>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Deadlines are locked to the school's local wall-clock zone.
            </p>
            <select
              value={newUniTz}
              onChange={(e) => setNewUniTz(e.target.value)}
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Program *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. PhD in Textile Engineering, PhD in Computer Science..."
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Degree & Term */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Degree
            </label>
            <select
              value={degree}
              onChange={(e) => setDegree(e.target.value as 'phd' | 'ms' | 'other')}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="phd">PhD</option>
              <option value="ms">MS / Master's</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Term
            </label>
            <input
              type="text"
              placeholder="e.g. Fall 2027"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Deadline Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deadline Date *
            </label>
            <input
              type="date"
              required
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              School Time (optional)
            </label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              placeholder="23:59"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono"
            />
            <span className="text-[10px] text-slate-400">Defaults to 23:59 if blank.</span>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Priority
          </label>
          <div className="mt-1 flex gap-4 text-xs">
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
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
