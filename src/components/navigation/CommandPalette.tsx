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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-[#000000]/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-none border-2 border-[#000000] bg-[#F8EEDF] text-[#000000] shadow-2xl flex flex-col">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[#000000]/20 px-4 py-3 bg-[#F8EEDF]">
          <Search className="h-4 w-4 text-[#8E1616] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search programs, professors, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#000000] placeholder:text-[#000000]/50 focus:outline-none font-sans"
          />
          <kbd className="rounded-none border border-[#000000]/30 bg-[#E8C999]/40 px-1.5 py-0.5 text-[10px] font-mono text-[#000000]">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4 text-xs">
          {/* Quick Actions */}
          <div>
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E1616]">
              Actions
            </span>
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQuickAdd();
                }}
                className="flex w-full items-center justify-between rounded-none px-2.5 py-2 text-left hover:bg-[#E8C999]/40 transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="h-4 w-4 text-[#8E1616]" />
                  <span className="font-serif text-sm">Create new application</span>
                </div>
                <kbd className="rounded-none border border-[#000000]/20 bg-[#E8C999]/30 px-1 font-mono text-[10px] text-[#000000]">
                  Ctrl+N
                </kbd>
              </button>
            </div>
          </div>

          {/* Applications Search Results */}
          {matchingApps.length > 0 && (
            <div>
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E1616]">
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
                    className="flex w-full items-center justify-between rounded-none px-2.5 py-2 text-left hover:bg-[#E8C999]/40 transition-colors"
                  >
                    <div>
                      <span className="font-serif font-bold text-[#000000]">
                        {uniMap.get(app.university_id)}
                      </span>{' '}
                      <span className="text-[#000000]/60">— {app.program}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#8E1616]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Faculty / Contacts Search Results */}
          {matchingContacts.length > 0 && (
            <div>
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E1616]">
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
                    className="flex w-full items-center justify-between rounded-none px-2.5 py-2 text-left hover:bg-[#E8C999]/40 transition-colors"
                  >
                    <div>
                      <span className="font-serif font-bold text-[#000000]">{c.name}</span>{' '}
                      <span className="text-[#000000]/60 font-mono text-[11px]">
                        ({c.title || c.affiliation || c.kind})
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#8E1616]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <div>
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E1616]">
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
                    className="flex w-full items-center gap-2.5 rounded-none px-2.5 py-2 text-left hover:bg-[#E8C999]/40 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-[#8E1616] shrink-0" />
                    <span className="font-serif text-sm">{action.label}</span>
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
