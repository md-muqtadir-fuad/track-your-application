import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DateTime } from 'luxon';
import { SqlJsExecutor } from '../db/sqljs-executor';
import { createRepositories, type Repositories } from '../db/repositories';
import { calculateReadiness, isAtRisk, createApplicationWithDefaults } from './application-service';
import type { ChecklistItem, LetterRequest, Application, Milestone } from '../db/schema';

describe('Application Service Unit Tests', () => {
  let executor: SqlJsExecutor;
  let repos: Repositories;

  beforeEach(async () => {
    executor = await SqlJsExecutor.create();
    const migrationPath = path.resolve(__dirname, '../../../migrations/0001_init.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await executor.runMigration(migrationSql);
    repos = createRepositories(executor);
  });

  afterEach(async () => {
    await executor.close();
  });

  describe('calculateReadiness', () => {
    it('returns 100% when no items exist', () => {
      expect(calculateReadiness([], [])).toBe(100);
    });

    it('correctly calculates ratio of completed required items and submitted letters', () => {
      const mockItems: ChecklistItem[] = [
        {
          id: '1',
          application_id: 'app1',
          kind: 'sop',
          label: 'SOP',
          status: 'done',
          notes: '',
          sort_order: 0,
          created_at: '',
          updated_at: '',
        },
        {
          id: '2',
          application_id: 'app1',
          kind: 'cv',
          label: 'CV',
          status: 'todo',
          notes: '',
          sort_order: 1,
          created_at: '',
          updated_at: '',
        },
        {
          id: '3',
          application_id: 'app1',
          kind: 'test_scores',
          label: 'GRE',
          status: 'not_required',
          notes: '',
          sort_order: 2,
          created_at: '',
          updated_at: '',
        },
      ];

      const mockLetters: LetterRequest[] = [
        {
          id: 'l1',
          application_id: 'app1',
          contact_id: 'c1',
          status: 'submitted',
          waived_right_to_view: true,
          notes: '',
          created_at: '',
          updated_at: '',
        },
        {
          id: 'l2',
          application_id: 'app1',
          contact_id: 'c2',
          status: 'asked',
          waived_right_to_view: true,
          notes: '',
          created_at: '',
          updated_at: '',
        },
      ];

      // Required: SOP (done), CV (todo), Letter1 (submitted), Letter2 (asked) = 4 total, 2 completed -> 50%
      const readiness = calculateReadiness(mockItems, mockLetters);
      expect(readiness).toBe(50);
    });
  });

  describe('isAtRisk', () => {
    const baseApp: Application = {
      id: 'app1',
      university_id: 'u1',
      program: 'PhD Computer Science',
      department: 'CS',
      degree: 'phd',
      term: 'Fall 2027',
      status: 'Applying',
      priority: 1,
      fit: 5,
      tags: '[]',
      program_url: '',
      portal_url: '',
      portal_username: '',
      faculty_contact_policy: 'encouraged',
      fee_currency: 'USD',
      waiver_route: 'none',
      waiver_status: 'not_applicable',
      notes: '',
      created_at: '',
      updated_at: '',
    };

    it('returns false for already submitted application', () => {
      const submittedApp: Application = { ...baseApp, status: 'Submitted' };
      const res = isAtRisk(submittedApp, null, 40, []);
      expect(res.atRisk).toBe(false);
    });

    it('flags application at risk if deadline is in 10 days and readiness is under 80%', () => {
      const now = DateTime.fromISO('2026-12-01T12:00:00Z');
      const milestone: Milestone = {
        id: 'm1',
        application_id: 'app1',
        kind: 'application',
        label: 'Deadline',
        due_local: '2026-12-11T23:59',
        tz: 'America/New_York',
        time_assumed: false,
        notes: '',
        created_at: '',
        updated_at: '',
      };

      const res = isAtRisk(baseApp, milestone, 60, [], now);
      expect(res.atRisk).toBe(true);
      expect(res.reasons.length).toBeGreaterThan(0);
    });

    it('flags application at risk if deadline is in 5 days and letters are pending', () => {
      const now = DateTime.fromISO('2026-12-01T12:00:00Z');
      const milestone: Milestone = {
        id: 'm1',
        application_id: 'app1',
        kind: 'application',
        label: 'Deadline',
        due_local: '2026-12-06T23:59',
        tz: 'America/New_York',
        time_assumed: false,
        notes: '',
        created_at: '',
        updated_at: '',
      };

      const pendingLetter: LetterRequest = {
        id: 'l1',
        application_id: 'app1',
        contact_id: 'c1',
        status: 'asked',
        waived_right_to_view: true,
        notes: '',
        created_at: '',
        updated_at: '',
      };

      const res = isAtRisk(baseApp, milestone, 90, [pendingLetter], now);
      expect(res.atRisk).toBe(true);
      expect(res.reasons.some((r) => r.includes('letter recommendation'))).toBe(true);
    });
  });

  describe('createApplicationWithDefaults', () => {
    it('creates university, application, deadline milestone and default checklist items', async () => {
      const { application, milestone } = await createApplicationWithDefaults(repos, {
        university_name: 'Stanford University',
        university_tz: 'America/Los_Angeles',
        program: 'PhD in Computer Science',
        degree: 'phd',
        term: 'Fall 2027',
        deadline_date: '2026-12-15',
        deadline_time: '23:59',
        priority: 1,
      });

      expect(application.id).toBeDefined();
      expect(application.program).toBe('PhD in Computer Science');
      expect(milestone.due_local).toBe('2026-12-15T23:59');
      expect(milestone.tz).toBe('America/Los_Angeles');

      const items = await repos.checklistItems.listByApplication(application.id);
      expect(items.length).toBeGreaterThan(5);
      expect(items.some((i) => i.kind === 'sop')).toBe(true);
    });

    it('defaults deadline time to 23:59 and flags time_assumed if omitted', async () => {
      const { milestone } = await createApplicationWithDefaults(repos, {
        university_name: 'UC Berkeley',
        university_tz: 'America/Los_Angeles',
        program: 'PhD in IEOR',
        deadline_date: '2026-12-15',
      });

      expect(milestone.due_local).toBe('2026-12-15T23:59');
      expect(milestone.time_assumed).toBe(true);
      expect(milestone.notes).toContain('Time assumed');
    });
  });
});
