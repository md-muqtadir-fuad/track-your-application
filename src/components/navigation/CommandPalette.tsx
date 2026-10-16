import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  FileText,
  Award,
  Settings,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useDatabase } from '../../lib/db/context';
import type { Application, University, Contact } from '../../lib/db/schema';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewId: string, applicationId?: string) => void;
  onOpenQuickAdd: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenQuickAdd,
}) => {
  const { repos } = useDatabase();
  const [query, setQuery] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
      if (repos) {
        Promise.all([
          repos.applications.list(),
          repos.universities.list(),
          repos.contacts.list(),
        ]).then(([apps, unis, cts]) => {
          setApplications(apps);
          setUniversities(unis);
          setContacts(cts);
        });
      }
    }
  }, [isOpen, repos]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const uniMap = new Map<string, string>();
  for (const u of universities) {
    uniMap.set(u.id, u.name);
  }

  const matchingApps = applications.filter((a) => {
    const uniName = uniMap.get(a.university_id) ?? '';
    const q = query.toLowerCase();
    return a.program.toLowerCase().includes(q) || uniName.toLowerCase().includes(q);
  });

  const matchingContacts = contacts.filter((c) => {
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.affiliation.toLowerCase().includes(q);
  });

  const navActions = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard },
    { id: 'applications', label: 'Go to Applications (Table & Board)', icon: GraduationCap },
    { id: 'recommenders', label: 'Go to Recommenders Matrix', icon: Users },
    { id: 'faculty', label: 'Go to Faculty Outreach', icon: UserCheck },
    { id: 'calendar', label: 'Go to Calendar', icon: Calendar },
    { id: 'documents', label: 'Go to Documents & Test Scores', icon: FileText },
    { id: 'offers', label: 'Go to Offers Comparison', icon: Award },
    { id: 'settings', label: 'Go to Settings', icon: Settings },
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search programs, professors, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:bg-slate-800">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4 text-xs">
          {/* Quick Actions */}
          <div>
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Actions
            </span>
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQuickAdd();
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Create new application</span>
                </div>
                <kbd className="rounded bg-slate-100 px-1 font-mono text-[10px] dark:bg-slate-800">
                  Ctrl+N
                </kbd>
              </button>
            </div>
          </div>

          {/* Applications Search Results */}
          {matchingApps.length > 0 && (
            <div>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Applications
              </span>
              <div className="mt-1 space-y-0.5">
                {matchingApps.slice(0, 5).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('applications', app.id);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {uniMap.get(app.university_id)}
                      </span>{' '}
                      <span className="text-slate-500">— {app.program}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Faculty / Contacts Search Results */}
          {matchingContacts.length > 0 && (
            <div>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Faculty & References
              </span>
              <div className="mt-1 space-y-0.5">
                {matchingContacts.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate(c.kind === 'faculty' ? 'faculty' : 'recommenders');
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.name}
                      </span>{' '}
                      <span className="text-slate-400">({c.title || c.affiliation || c.kind})</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <div>
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </span>
            <div className="mt-1 space-y-0.5">
              {navActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate(action.id);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
