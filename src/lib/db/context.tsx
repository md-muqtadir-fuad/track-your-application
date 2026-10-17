import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Executor } from './executor';
import { SqlJsExecutor } from './sqljs-executor';
import { createRepositories, type Repositories } from './repositories';
import initMigrationSql from '../../../migrations/0001_init.sql?raw';
import { loadDemoData, clearDemoData } from '../demo/demo-data';
import { DEFAULT_USER_TIMEZONE } from '../time';
import { hasUserData, loadUserData } from '../user/user-loader';
import { useAuth } from '../firebase/auth-context';
import { getFirebaseServices } from '../firebase/config';
import {
  loadLocalSnapshot,
  saveLocalSnapshot,
  syncToFirestore,
  loadFromFirestore,
} from '../firebase/sync';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface DatabaseContextValue {
  repos: Repositories | null;
  executor: Executor | null;
  isLoading: boolean;
  error: Error | null;
  version: number;
  userTz: string;
  setUserTz: (tz: string) => Promise<void>;
  refresh: () => void;
  loadDemo: () => Promise<void>;
  clearDemo: () => Promise<void>;
  loadUser: () => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncError: string | null;
  syncNow: () => Promise<{ success: boolean; error?: string }>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [repos, setRepos] = useState<Repositories | null>(null);
  const [executor, setExecutor] = useState<SqlJsExecutor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  const [userTz, setUserTzState] = useState(DEFAULT_USER_TIMEZONE);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const executorRef = useRef<SqlJsExecutor | null>(null);
  const reposRef = useRef<Repositories | null>(null);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // Sync action
  const syncNow = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const currentExec = executorRef.current;
    const currentRepos = reposRef.current;
    if (!currentExec || !currentRepos) return { success: false, error: 'Database not initialized' };

    const binary = currentExec.exportBinary();
    if (binary) {
      await saveLocalSnapshot(binary);
    }

    const { db } = getFirebaseServices();
    if (db && user) {
      setSyncStatus('syncing');
      try {
        await syncToFirestore(db, user.uid, currentExec, currentRepos);
        setSyncStatus('synced');
        setLastSyncError(null);
        return { success: true };
      } catch (err: unknown) {
        console.error('Firestore sync error:', err);
        const errMsg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err);
        setSyncStatus('error');
        setLastSyncError(errMsg);
        return { success: false, error: errMsg };
      }
    } else {
      setSyncStatus('offline');
      setLastSyncError(null);
      return { success: true };
    }
  }, [user]);

  // Initial database load
  useEffect(() => {
    let isMounted = true;

    async function initDb() {
      try {
        setIsLoading(true);
        const { db } = getFirebaseServices();

        let initialBinary: Uint8Array | null = null;

        // 1. If user is logged in, check Firestore first
        if (db && user) {
          initialBinary = await loadFromFirestore(db, user.uid);
        }

        // 2. If no cloud snapshot, check local IndexedDB
        if (!initialBinary) {
          initialBinary = await loadLocalSnapshot();
        }

        let sqlJsExec: SqlJsExecutor;
        if (initialBinary) {
          sqlJsExec = await SqlJsExecutor.create(initialBinary);
        } else {
          sqlJsExec = await SqlJsExecutor.create();
          await sqlJsExec.runMigration(initMigrationSql);
        }

        const r = createRepositories(sqlJsExec);
        executorRef.current = sqlJsExec;
        reposRef.current = r;

        // Load configured user time zone
        const storedTz = await r.settings.get('user_timezone', DEFAULT_USER_TIMEZONE);

        // Check if user data exists and seed if empty
        if (hasUserData()) {
          const unis = await r.universities.list();
          const apps = await r.applications.list();
          const hasDemoUni = unis.some((u) => u.name === 'Example State University');
          const hasUserUni = unis.some((u) => u.name === 'NC State University');
          if (hasDemoUni && !hasUserUni) {
            await clearDemoData(r.executor);
            await loadUserData(r);
          } else if (unis.length === 0 || apps.length === 0) {
            await loadUserData(r);
          }
        }

        // Save initial snapshot
        const binary = sqlJsExec.exportBinary();
        if (binary) {
          await saveLocalSnapshot(binary);
        }

        if (isMounted) {
          setExecutor(sqlJsExec);
          setRepos(r);
          setUserTzState(storedTz || DEFAULT_USER_TIMEZONE);
          setIsLoading(false);
          if (db && user) {
            setSyncStatus('synced');
          } else {
            setSyncStatus('offline');
          }
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    initDb();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Auto-sync on data version change
  useEffect(() => {
    if (version > 0) {
      syncNow();
    }
  }, [version, syncNow]);

  const setUserTz = useCallback(
    async (tz: string) => {
      if (!repos) return;
      await repos.settings.set('user_timezone', tz);
      setUserTzState(tz);
      refresh();
    },
    [repos, refresh],
  );

  const loadDemo = useCallback(async () => {
    if (!repos) return;
    await loadDemoData(repos.executor);
    refresh();
  }, [repos, refresh]);

  const clearDemo = useCallback(async () => {
    if (!repos) return;
    await clearDemoData(repos.executor);
    const binary = (repos.executor as SqlJsExecutor).exportBinary();
    if (binary) {
      await saveLocalSnapshot(binary);
    }
    refresh();
  }, [repos, refresh]);

  const loadUser = useCallback(async () => {
    if (!repos) return;
    await loadUserData(repos);
    refresh();
  }, [repos, refresh]);

  return (
    <DatabaseContext.Provider
      value={{
        repos,
        executor,
        isLoading,
        error,
        version,
        userTz,
        setUserTz,
        refresh,
        loadDemo,
        clearDemo,
        loadUser,
        syncStatus,
        lastSyncError,
        syncNow,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
