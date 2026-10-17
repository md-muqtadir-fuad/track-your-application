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
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
} from 'lucide-react';
import { AuthProvider, useAuth } from './lib/firebase/auth-context';
import { DatabaseProvider, useDatabase } from './lib/db/context';
import { ToastProvider, useToast } from './components/ui/ToastContext';
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

  const { isLoading, error, syncStatus, syncNow, lastSyncError } = useDatabase();
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      showToast({ type: 'success', message: 'Signed in with Google successfully!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      showToast({
        type: 'info',
        message: 'Signed out successfully. Operating in local offline database mode.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast({ type: 'error', message: `Sign out failed: ${msg}` });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSyncClick = async () => {
    if (!user) {
      showToast({
        type: 'info',
        message:
          'Local SQLite database is active. Sign in with Google to enable Cloud Firestore sync.',
      });
      return;
    }
    showToast({ type: 'info', message: 'Syncing dossier with Cloud Firestore...' });
    const res = await syncNow();
    if (res.success) {
      showToast({
        type: 'success',
        message: 'Dossier successfully synchronized with Cloud Firestore!',
      });
    } else {
      showToast({
        type: 'error',
        message: res.error
          ? `Cloud sync notice: ${res.error}`
          : 'Could not sync to Firestore. Ensure Firestore Database is created in Firebase Console.',
      });
    }
  };

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8EEDF] text-[#000000]">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#8E1616] bg-[#8E1616] text-[#F8EEDF] font-serif text-2xl font-bold shadow-xs">
            Ψ
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-bold tracking-tight text-[#8E1616]">
              Doctoral Dossier Registry
            </h2>
            <p className="font-mono text-xs uppercase tracking-widest text-[#000000]/70">
              Initializing Candidate Registry...
            </p>
          </div>
          <div className="h-0.5 w-36 mx-auto bg-[#000000]/15 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[#8E1616] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8EEDF] p-6 text-[#000000]">
        <div className="max-w-md border-2 border-[#8E1616] bg-[#F8EEDF] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#8E1616] font-serif font-bold text-base border-b border-[#8E1616]/30 pb-2">
            <span>⚠</span>
            <h2>Registry Initialization Error</h2>
          </div>
          <p className="mt-3 font-mono text-xs text-[#000000]/80">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-[#F8EEDF] text-[#000000]">
      {/* Sidebar Navigation */}
      <aside className="sidebar flex w-64 flex-col border-r border-[#000000]/15 bg-[#F8EEDF] p-4 shrink-0">
        {/* App Title & Header */}
        <div className="mb-5 px-1 py-1 border-b border-[#000000]/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-none bg-[#8E1616] flex items-center justify-center text-[#F8EEDF] font-serif font-bold text-xs">
              Ψ
            </div>
            <div>
              <h1 className="font-serif text-base font-bold tracking-tight text-[#8E1616] leading-none">
                Track Your PhD
              </h1>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#000000]/60 mt-1">
                Doctoral Candidate Dossier
              </p>
            </div>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-none bg-[#8E1616] px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Application</span>
            <kbd className="ml-auto rounded-none bg-[#6d1010] px-1 text-[9px] text-[#E8C999]">
              Ctrl+N
            </kbd>
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
                className={`flex w-full items-center gap-3 rounded-none px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#8E1616] text-[#F8EEDF] font-semibold border-l-4 border-[#E8C999]'
                    : 'text-[#000000]/75 hover:bg-[#E8C999]/40 hover:text-[#000000]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#E8C999]' : 'text-[#8E1616]'}`}
                  aria-hidden="true"
                />
                <span className={isActive ? 'font-serif text-sm' : ''}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer shortcuts & status */}
        <div className="border-t border-[#000000]/15 pt-3 flex items-center justify-between text-[10px] font-mono text-[#000000]/50">
          <span>v0.2.0 • LOCAL-FIRST</span>
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            title="Keyboard shortcuts (?)"
            className="hover:text-[#8E1616] p-1"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#F8EEDF]">
        {/* Automated Lead-time Reminder Banner */}
        <ReminderBanner />

        {/* Top Navbar */}
        <header className="flex h-14 items-center justify-between border-b border-[#000000]/15 bg-[#F8EEDF] px-8 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-bold tracking-tight text-[#000000]">
              {currentNav.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Status Button */}
            <button
              type="button"
              onClick={handleSyncClick}
              title={
                user
                  ? syncStatus === 'error'
                    ? `Cloud Sync Issue: ${lastSyncError ?? 'Click to inspect & retry'}`
                    : `Cloud Sync: ${syncStatus} (Click to force sync)`
                  : 'Local database active (Sign in with Google to sync to cloud)'
              }
              className={`flex items-center gap-1.5 rounded-none border px-2.5 py-1.5 text-xs font-mono transition ${
                syncStatus === 'error'
                  ? 'border-[#8E1616] bg-[#8E1616]/10 text-[#8E1616] hover:bg-[#8E1616]/20'
                  : 'border-[#000000]/20 bg-white/80 text-[#000000] hover:bg-[#E8C999]/30'
              }`}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#8E1616]" />
              ) : syncStatus === 'synced' ? (
                <Cloud className="h-3.5 w-3.5 text-[#8E1616]" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-[#8E1616]" />
              )}
              <span className="hidden sm:inline uppercase text-[10px] font-bold">
                SYNC: {syncStatus}
              </span>
            </button>

            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsCmdPaletteOpen(true)}
              className="flex items-center gap-2 rounded-none border border-[#000000]/20 bg-white/80 px-3 py-1.5 text-xs font-mono text-[#000000]/60 hover:border-[#8E1616]"
            >
              <Search className="h-3.5 w-3.5 text-[#8E1616]" />
              <span>Jump to dossier...</span>
              <kbd className="rounded-none border border-[#000000]/20 bg-[#F8EEDF] px-1 py-0.2 text-[9px] font-mono text-[#000000]">
                Ctrl+K
              </kbd>
            </button>

            {/* User Profile / Google Sign-In */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#000000]/20">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? 'User'}
                    className="h-7 w-7 rounded-none border border-[#8E1616]"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-none bg-[#8E1616] text-xs font-mono font-bold text-[#F8EEDF]">
                    {((user.displayName ?? user.email ?? 'U')[0] ?? 'U').toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-serif font-bold text-[#000000] hidden md:inline">
                  {user.displayName?.split(' ')[0] ?? user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  title="Sign out"
                  className="rounded-none p-1 text-[#000000]/50 hover:bg-[#E8C999]/40 hover:text-[#8E1616] disabled:opacity-50 transition"
                  aria-label="Sign out"
                >
                  {isSigningOut ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#8E1616]" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={authLoading || isSigningIn}
                className="flex items-center gap-1.5 rounded-none bg-[#8E1616] px-3.5 py-1.5 text-xs font-mono uppercase font-bold tracking-wider text-[#F8EEDF] hover:bg-[#6d1010] border border-[#8E1616] transition disabled:opacity-60 shadow-none"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
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
    <AuthProvider>
      <ToastProvider>
        <DatabaseProvider>
          <MainShell />
        </DatabaseProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
