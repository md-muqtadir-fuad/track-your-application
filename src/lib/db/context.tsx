import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Executor } from './executor';
import { TauriSqlExecutor } from './tauri-executor';
import { SqlJsExecutor } from './sqljs-executor';
import { createRepositories, type Repositories } from './repositories';
import initMigrationSql from '../../../migrations/0001_init.sql?raw';
import { loadDemoData, clearDemoData } from '../demo/demo-data';
import { DEFAULT_USER_TIMEZONE } from '../time';
import { hasUserData, loadUserData } from '../user/user-loader';

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
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [repos, setRepos] = useState<Repositories | null>(null);
  const [executor, setExecutor] = useState<Executor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  const [userTz, setUserTzState] = useState(DEFAULT_USER_TIMEZONE);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initDb() {
      try {
        let exec: Executor;
        const isTauri =
          typeof window !== 'undefined' &&
          Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

        if (isTauri) {
          const tauriExec = new TauriSqlExecutor();
          await tauriExec.init();
          exec = tauriExec;
        } else {
          const sqlJsExec = await SqlJsExecutor.create();
          await sqlJsExec.runMigration(initMigrationSql);
          exec = sqlJsExec;
        }

        const r = createRepositories(exec);

        // Load configured user time zone
        const storedTz = await r.settings.get('user_timezone', DEFAULT_USER_TIMEZONE);

        // Check if user data exists and seed if empty or if previous state had dummy data
        if (hasUserData()) {
          const unis = await r.universities.list();
          const hasDemoUni = unis.some((u) => u.name === 'Example State University');
          const hasUserUni = unis.some((u) => u.name === 'NC State University');
          if (hasDemoUni && !hasUserUni) {
            await clearDemoData(r.executor);
            await loadUserData(r);
          } else if (unis.length === 0) {
            await loadUserData(r);
          }
        }

        if (isMounted) {
          setExecutor(exec);
          setRepos(r);
          setUserTzState(storedTz || DEFAULT_USER_TIMEZONE);
          setIsLoading(false);
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
  }, []);

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

export function useRepositories(): Repositories {
  const { repos } = useDatabase();
  if (!repos) {
    throw new Error('Repositories accessed before database initialization');
  }
  return repos;
}
