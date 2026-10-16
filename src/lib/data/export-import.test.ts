import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqlJsExecutor } from '../db/sqljs-executor';
import { createRepositories, type Repositories } from '../db/repositories';
import { loadDemoData } from '../demo/demo-data';
import initSql from '../../../migrations/0001_init.sql?raw';
import { exportDatabaseToJson, exportApplicationsToCsv } from './export-import';

describe('export-import', () => {
  let executor: SqlJsExecutor;
  let repos: Repositories;

  beforeEach(async () => {
    executor = await SqlJsExecutor.create();
    await executor.runMigration(initSql);
    repos = createRepositories(executor);
    await loadDemoData(executor);
  });

  afterEach(async () => {
    await executor.close();
  });

  it('exports entire database to a valid JSON snapshot', async () => {
    const jsonStr = await exportDatabaseToJson(repos);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe(1);
    expect(parsed.universities.length).toBeGreaterThan(0);
    expect(parsed.applications.length).toBeGreaterThan(0);
    expect(parsed.checklist_items.length).toBeGreaterThan(0);
    expect(parsed.contacts.length).toBeGreaterThan(0);
  });

  it('exports applications to formatted CSV lines', async () => {
    const csvStr = await exportApplicationsToCsv(repos);
    const lines = csvStr.split('\r\n');

    expect(lines[0]).toContain('University,Program,Department,Degree');
    expect(lines.length).toBeGreaterThan(1);
    expect(csvStr).toContain('Example State University');
  });
});
