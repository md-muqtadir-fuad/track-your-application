import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SqlJsExecutor } from './sqljs-executor';
import {
  UniversityRepository,
  ApplicationRepository,
  MilestoneRepository,
  ChecklistItemRepository,
  ContactRepository,
  LetterRequestRepository,
  SettingRepository,
} from './repositories';
import { loadDemoData } from '../demo/demo-data';

describe('Repositories against in-memory SQLite using real migrations (SPEC Section 10)', () => {
  let executor: SqlJsExecutor;

  beforeEach(async () => {
    executor = await SqlJsExecutor.create();
    const migrationPath = path.resolve(__dirname, '../../../migrations/0001_init.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await executor.runMigration(migrationSql);
  });

  afterEach(async () => {
    await executor.close();
  });

  it('performs CRUD and soft delete operations on universities', () => {
    return (async () => {
      const repo = new UniversityRepository(executor);

      const created = await repo.create({
        name: 'UC Berkeley',
        country: 'United States',
        city: 'Berkeley',
        tz: 'America/Los_Angeles',
        website: 'https://berkeley.edu',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('UC Berkeley');
      expect(created.tz).toBe('America/Los_Angeles');

      const list = await repo.list();
      expect(list).toHaveLength(1);

      await repo.update(created.id, { city: 'Berkeley, CA' });
      const updated = await repo.getById(created.id);
      expect(updated?.city).toBe('Berkeley, CA');

      await repo.softDelete(created.id);
      const activeList = await repo.list(false);
      expect(activeList).toHaveLength(0);

      const allList = await repo.list(true);
      expect(allList).toHaveLength(1);

      await repo.restore(created.id);
      const restoredList = await repo.list(false);
      expect(restoredList).toHaveLength(1);
    })();
  });

  it('creates applications and records status changes', () => {
    return (async () => {
      const uRepo = new UniversityRepository(executor);
      const appRepo = new ApplicationRepository(executor);

      const u = await uRepo.create({
        name: 'MIT',
        tz: 'America/New_York',
      });

      const app = await appRepo.create({
        university_id: u.id,
        program: 'EECS PhD',
        status: 'Exploring',
        priority: 1,
      });

      expect(app.id).toBeDefined();
      expect(app.status).toBe('Exploring');

      await appRepo.updateStatus(app.id, 'Applying');
      const updated = await appRepo.getById(app.id);
      expect(updated?.status).toBe('Applying');

      const history = await appRepo.getStatusHistory(app.id);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0]?.to_status).toBe('Exploring');
      expect(history[1]?.from_status).toBe('Exploring');
      expect(history[1]?.to_status).toBe('Applying');
    })();
  });

  it('manages milestones with exact wall-clock times and time zones', () => {
    return (async () => {
      const uRepo = new UniversityRepository(executor);
      const appRepo = new ApplicationRepository(executor);
      const mRepo = new MilestoneRepository(executor);

      const u = await uRepo.create({ name: 'Stanford', tz: 'America/Los_Angeles' });
      const app = await appRepo.create({ university_id: u.id, program: 'CS PhD' });

      const milestone = await mRepo.create({
        application_id: app.id,
        kind: 'application',
        label: 'Deadline',
        due_local: '2026-12-15T23:59',
        tz: 'America/Los_Angeles',
        time_assumed: false,
      });

      expect(milestone.due_local).toBe('2026-12-15T23:59');
      expect(milestone.tz).toBe('America/Los_Angeles');

      await mRepo.markDone(milestone.id, '2026-12-10T15:00:00Z');
      const updated = await mRepo.getById(milestone.id);
      expect(updated?.done_at).toBe('2026-12-10T15:00:00Z');
    })();
  });

  it('manages recommenders and letter requests per application', () => {
    return (async () => {
      const uRepo = new UniversityRepository(executor);
      const appRepo = new ApplicationRepository(executor);
      const contactRepo = new ContactRepository(executor);
      const letterRepo = new LetterRequestRepository(executor);

      const u = await uRepo.create({ name: 'CMU', tz: 'America/New_York' });
      const app = await appRepo.create({ university_id: u.id, program: 'Robotics PhD' });

      const recommender = await contactRepo.create({
        kind: 'recommender',
        name: 'Dr. Ada Placeholder',
        email: 'ada@example.edu',
      });

      await letterRepo.upsert({
        application_id: app.id,
        contact_id: recommender.id,
        status: 'asked',
        asked_on: '2026-10-15',
        waived_right_to_view: true,
      });

      const requests = await letterRepo.listByApplication(app.id);
      expect(requests).toHaveLength(1);
      expect(requests[0]?.status).toBe('asked');

      await letterRepo.updateStatus(requests[0]!.id, 'submitted');
      const updated = await letterRepo.listByApplication(app.id);
      expect(updated[0]?.status).toBe('submitted');
      expect(updated[0]?.submitted_on).toBeDefined();
    })();
  });

  it('manages checklist items for an application', () => {
    return (async () => {
      const uRepo = new UniversityRepository(executor);
      const appRepo = new ApplicationRepository(executor);
      const checkRepo = new ChecklistItemRepository(executor);

      const u = await uRepo.create({ name: 'Harvard', tz: 'America/New_York' });
      const app = await appRepo.create({ university_id: u.id, program: 'Biomedical PhD' });

      const item = await checkRepo.create({
        application_id: app.id,
        kind: 'sop',
        label: 'Statement of Purpose',
        status: 'todo',
        sort_order: 1,
      });

      expect(item.id).toBeDefined();
      expect(item.status).toBe('todo');

      await checkRepo.updateStatus(item.id, 'done');
      const items = await checkRepo.listByApplication(app.id);
      expect(items[0]?.status).toBe('done');
    })();
  });

  it('loads and verifies fictional demo data', () => {
    return (async () => {
      await loadDemoData(executor);

      const uRepo = new UniversityRepository(executor);
      const appRepo = new ApplicationRepository(executor);
      const contactRepo = new ContactRepository(executor);
      const settingRepo = new SettingRepository(executor);

      const universities = await uRepo.list();
      expect(universities.length).toBeGreaterThanOrEqual(3);

      const applications = await appRepo.list();
      expect(applications.length).toBeGreaterThanOrEqual(3);

      const recommenders = await contactRepo.list('recommender');
      expect(recommenders.length).toBeGreaterThanOrEqual(3);

      const myTz = await settingRepo.get('my_timezone');
      expect(myTz).toBe('Asia/Dhaka');
    })();
  });
});
