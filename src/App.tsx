import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  FileText,
  Award,
  Settings,
  Plus,
  Search,
  HelpCircle,
} from 'lucide-react';
import { DatabaseProvider, useDatabase } from './lib/db/context';
import { ToastProvider } from './components/ui/ToastContext';
import { ReminderBanner } from './components/ui/ReminderBanner';
import { DashboardView } from './components/views/DashboardView';
import { ApplicationsView } from './components/views/ApplicationsView';
import { RecommendersView } from './components/views/RecommendersView';
import { FacultyView } from './components/views/FacultyView';
import { CalendarView } from './components/views/CalendarView';
import { DocumentsScoresView } from './components/views/DocumentsScoresView';
import { OffersView } from './components/views/OffersView';
import { SettingsView } from './components/views/SettingsView';
import { QuickAddModal } from './components/views/QuickAddModal';
import { CommandPalette } from './components/navigation/CommandPalette';
import { KeyboardHelpModal } from './components/navigation/KeyboardHelpModal';
import './App.css';

export type NavItemId =
  | 'dashboard'
  | 'applications'
  | 'recommenders'
  | 'faculty'
  | 'calendar'
  | 'documents'
  | 'offers'
  | 'settings';

interface NavItem {
  id: NavItemId;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'applications', label: 'Applications', icon: GraduationCap },
  { id: 'recommenders', label: 'Recommenders', icon: Users },
  { id: 'faculty', label: 'Faculty', icon: UserCheck },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'documents', label: 'Documents & scores', icon: FileText },
  { id: 'offers', label: 'Offers', icon: Award },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function MainShell() {
  const [activeItem, setActiveItem] = useState<NavItemId>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const { isLoading, error } = useDatabase();

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdPaletteOpen(true);
      } else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsHelpOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentNav = NAV_ITEMS.find((item) => item.id === activeItem) ?? NAV_ITEMS[0]!;

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-sm font-medium">Opening your PhD tracker database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 shadow-lg dark:border-rose-900 dark:bg-slate-900">
          <h2 className="text-base font-bold text-rose-700 dark:text-rose-400">
            Database Initialization Error
          </h2>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="sidebar flex w-64 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shrink-0">
        {/* App Title & Header */}
        <div className="mb-5 px-2 py-1">
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Track Your PhD
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Local-First Application Tracker
          </p>
        </div>

        {/* Quick Add Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Application</span>
            <kbd className="ml-auto rounded bg-blue-700 px-1 text-[10px] text-blue-100">Ctrl+N</kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Main Navigation" className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeItem;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer shortcuts & status */}
        <div className="border-t border-slate-200 pt-3 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>v0.2.0 • Offline</span>
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            title="Keyboard shortcuts (?)"
            className="hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Automated Lead-time Reminder Banner */}
        <ReminderBanner />

        {/* Top Navbar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-8 dark:border-slate-800 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {currentNav.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsCmdPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search or jump to...</span>
              <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono shadow-2xs dark:bg-slate-900">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-auto p-8">
          {activeItem === 'dashboard' && (
            <DashboardView
              onNavigate={(tab) => setActiveItem(tab as NavItemId)}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}
          {activeItem === 'applications' && <ApplicationsView />}
          {activeItem === 'recommenders' && <RecommendersView />}
          {activeItem === 'faculty' && <FacultyView />}
          {activeItem === 'calendar' && (
            <CalendarView onSelectApplication={() => setActiveItem('applications')} />
          )}
          {activeItem === 'documents' && <DocumentsScoresView />}
          {activeItem === 'offers' && <OffersView />}
          {activeItem === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals */}
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onNavigate={(tab) => setActiveItem(tab as NavItemId)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />
      <KeyboardHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <DatabaseProvider>
        <MainShell />
      </DatabaseProvider>
    </ToastProvider>
  );
}

export default App;
