import { useState } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  FileText,
  Award,
  Settings,
} from 'lucide-react';
import './App.css';

type NavItemId =
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

export function App() {
  const [activeItem, setActiveItem] = useState<NavItemId>('dashboard');

  const currentNav = NAV_ITEMS.find((item) => item.id === activeItem) ?? NAV_ITEMS[0]!;

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="sidebar flex w-64 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 px-2 py-1">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Track Your PhD
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Application Tracker</p>
        </div>

        <nav aria-label="Main Navigation" className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeItem;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 pt-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          v0.1.0 • Offline
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <header className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {currentNav.label}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track your PhD applications, deadlines, and requirements.
          </p>
        </header>

        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Phase 0 bootstrap shell initialized. Ready for Phase 1 data layer.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
