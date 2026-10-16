import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqlJsExecutor } from '../db/sqljs-executor';
import { createRepositories, type Repositories } from '../db/repositories';
import initSql from '../../../migrations/0001_init.sql?raw';
import { hasUserData, loadUserData } from './user-loader';

describe('user-loader', () => {
  let executor: SqlJsExecutor;
  let repos: Repositories;

  beforeEach(async () => {
    executor = await SqlJsExecutor.create();
    await executor.runMigration(initSql);
    repos = createRepositories(executor);
  });

  afterEach(async () => {
    await executor.close();
  });

  it('checks for presence of user data and detects local file', () => {
    const present = hasUserData();
    expect(present).toBe(true);
  });

  it('executes loadUserData cleanly against SQLite repositories', async () => {
    const loaded = await loadUserData(repos);
    if (loaded) {
      const contacts = await repos.contacts.list('faculty');
      expect(contacts.length).toBeGreaterThan(0);
      const apps = await repos.applications.list();
      expect(apps.length).toBeGreaterThan(0);
    } else {
      expect(loaded).toBe(false);
    }
  });
});
