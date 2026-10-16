import { DateTime } from 'luxon';
import type { Executor } from './executor';
import {
  UniversitySchema,
  ApplicationSchema,
  MilestoneSchema,
  ChecklistItemSchema,
  ContactSchema,
  LetterRequestSchema,
  ReminderLogSchema,
  OfferSchema,
  StatusChangeSchema,
  type University,
  type Application,
  type Milestone,
  type ChecklistItem,
  type Contact,
  type LetterRequest,
  type Setting,
  type ReminderLog,
  type Offer,
  type StatusChange,
  type ApplicationStatus,
  type ContactKind,
  type ChecklistItemStatus,
  type LetterRequestStatus,
  type UniversityInput,
  type ApplicationInput,
  type MilestoneInput,
  type ChecklistItemInput,
  type ContactInput,
  type LetterRequestInput,
  type OfferInput,
} from './schema';

export type CreateUniversityData = Omit<
  UniversityInput,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type CreateApplicationData = Omit<
  ApplicationInput,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type CreateMilestoneData = Omit<
  MilestoneInput,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type CreateChecklistItemData = Omit<
  ChecklistItemInput,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type CreateContactData = Omit<
  ContactInput,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type CreateLetterRequestData = Omit<
  LetterRequestInput,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type CreateOfferData = Omit<OfferInput, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

function nowIso(): string {
  return DateTime.utc().toISO({ suppressMilliseconds: true }) ?? new Date().toISOString();
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class UniversityRepository {
  constructor(private readonly executor: Executor) {}

  async list(includeDeleted = false): Promise<University[]> {
    const query = includeDeleted
      ? 'SELECT * FROM university ORDER BY name ASC'
      : 'SELECT * FROM university WHERE deleted_at IS NULL ORDER BY name ASC';
    const rows = await this.executor.select<Record<string, unknown>>(query);
    return rows.map((r) => UniversitySchema.parse(r));
  }

  async getById(id: string): Promise<University | null> {
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM university WHERE id = ?',
      [id],
    );
    const first = rows[0];
    return first ? UniversitySchema.parse(first) : null;
  }

  async create(data: CreateUniversityData): Promise<University> {
    const id = generateId();
    const now = nowIso();
    await this.executor.execute(
      `INSERT INTO university (id, name, country, city, tz, website, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.country ?? '', data.city ?? '', data.tz, data.website ?? '', now, now],
    );
    return (await this.getById(id))!;
  }

  async update(
    id: string,
    data: Partial<Omit<University, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<University | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, updated_at: nowIso() };
    await this.executor.execute(
      `UPDATE university SET name = ?, country = ?, city = ?, tz = ?, website = ?, updated_at = ? WHERE id = ?`,
      [
        updated.name,
        updated.country,
        updated.city,
        updated.tz,
        updated.website,
        updated.updated_at,
        id,
      ],
    );
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.executor.execute(
      'UPDATE university SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [nowIso(), nowIso(), id],
    );
  }

  async restore(id: string): Promise<void> {
    await this.executor.execute(
      'UPDATE university SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [nowIso(), id],
    );
  }
}

export class ApplicationRepository {
  constructor(private readonly executor: Executor) {}

  async list(includeDeleted = false): Promise<Application[]> {
    const query = includeDeleted
      ? 'SELECT * FROM application ORDER BY created_at DESC'
      : 'SELECT * FROM application WHERE deleted_at IS NULL ORDER BY created_at DESC';
    const rows = await this.executor.select<Record<string, unknown>>(query);
    return rows.map((r) => ApplicationSchema.parse(r));
  }

  async getById(id: string): Promise<Application | null> {
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM application WHERE id = ?',
      [id],
    );
    const first = rows[0];
    return first ? ApplicationSchema.parse(first) : null;
  }

  async create(data: CreateApplicationData): Promise<Application> {
    const id = generateId();
    const now = nowIso();
    await this.executor.execute(
      `INSERT INTO application (
         id, university_id, program, department, degree, term, status,
         priority, fit, tags, program_url, portal_url, portal_username,
         faculty_contact_policy, fee_amount, fee_currency, fee_paid_on,
         waiver_route, waiver_status, submitted_at, notes, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.university_id,
        data.program,
        data.department ?? '',
        data.degree ?? 'phd',
        data.term ?? '',
        data.status ?? 'Exploring',
        data.priority ?? 2,
        data.fit ?? 3,
        typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags ?? []),
        data.program_url ?? '',
        data.portal_url ?? '',
        data.portal_username ?? '',
        data.faculty_contact_policy ?? 'unknown',
        data.fee_amount ?? null,
        data.fee_currency ?? 'USD',
        data.fee_paid_on ?? null,
        data.waiver_route ?? 'none',
        data.waiver_status ?? 'not_applicable',
        data.submitted_at ?? null,
        data.notes ?? '',
        now,
        now,
      ],
    );

    // Initial status log
    await this.executor.execute(
      `INSERT INTO status_change (id, application_id, from_status, to_status, changed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), id, '', data.status ?? 'Exploring', now, now, now],
    );

    return (await this.getById(id))!;
  }

  async update(
    id: string,
    data: Partial<Omit<Application, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Application | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (data.status && data.status !== existing.status) {
      await this.updateStatus(id, data.status);
    }

    const updated = {
      ...existing,
      ...data,
      updated_at: nowIso(),
    };

    await this.executor.execute(
      `UPDATE application SET
         university_id = ?, program = ?, department = ?, degree = ?, term = ?,
         status = ?, priority = ?, fit = ?, tags = ?, program_url = ?,
         portal_url = ?, portal_username = ?, faculty_contact_policy = ?,
         fee_amount = ?, fee_currency = ?, fee_paid_on = ?, waiver_route = ?,
         waiver_status = ?, submitted_at = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.university_id,
        updated.program,
        updated.department,
        updated.degree,
        updated.term,
        updated.status,
        updated.priority,
        updated.fit,
        typeof updated.tags === 'string' ? updated.tags : JSON.stringify(updated.tags),
        updated.program_url,
        updated.portal_url,
        updated.portal_username,
        updated.faculty_contact_policy,
        updated.fee_amount ?? null,
        updated.fee_currency,
        updated.fee_paid_on ?? null,
        updated.waiver_route,
        updated.waiver_status,
        updated.submitted_at ?? null,
        updated.notes,
        updated.updated_at,
        id,
      ],
    );

    return updated;
  }

  async updateStatus(id: string, newStatus: ApplicationStatus): Promise<void> {
    const existing = await this.getById(id);
    if (!existing || existing.status === newStatus) return;

    const now = nowIso();
    await this.executor.execute('UPDATE application SET status = ?, updated_at = ? WHERE id = ?', [
      newStatus,
      now,
      id,
    ]);

    await this.executor.execute(
      `INSERT INTO status_change (id, application_id, from_status, to_status, changed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), id, existing.status, newStatus, now, now, now],
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.executor.execute(
      'UPDATE application SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [nowIso(), nowIso(), id],
    );
  }

  async restore(id: string): Promise<void> {
    await this.executor.execute(
      'UPDATE application SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [nowIso(), id],
    );
  }

  async getStatusHistory(applicationId: string): Promise<StatusChange[]> {
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM status_change WHERE application_id = ? ORDER BY changed_at ASC',
      [applicationId],
    );
    return rows.map((r) => StatusChangeSchema.parse(r));
  }
}

export class MilestoneRepository {
  constructor(private readonly executor: Executor) {}

  async listByApplication(applicationId: string, includeDeleted = false): Promise<Milestone[]> {
    const query = includeDeleted
      ? 'SELECT * FROM milestone WHERE application_id = ? ORDER BY due_local ASC'
      : 'SELECT * FROM milestone WHERE application_id = ? AND deleted_at IS NULL ORDER BY due_local ASC';
    const rows = await this.executor.select<Record<string, unknown>>(query, [applicationId]);
    return rows.map((r) => MilestoneSchema.parse(r));
  }

  async listAll(includeDeleted = false): Promise<Milestone[]> {
    const query = includeDeleted
      ? 'SELECT * FROM milestone ORDER BY due_local ASC'
      : 'SELECT * FROM milestone WHERE deleted_at IS NULL ORDER BY due_local ASC';
    const rows = await this.executor.select<Record<string, unknown>>(query);
    return rows.map((r) => MilestoneSchema.parse(r));
  }

  async getById(id: string): Promise<Milestone | null> {
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM milestone WHERE id = ?',
      [id],
    );
    const first = rows[0];
    return first ? MilestoneSchema.parse(first) : null;
  }

  async create(data: CreateMilestoneData): Promise<Milestone> {
    const id = generateId();
    const now = nowIso();
    await this.executor.execute(
      `INSERT INTO milestone (id, application_id, kind, label, due_local, tz, time_assumed, done_at, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.application_id,
        data.kind,
        data.label,
        data.due_local,
        data.tz,
        data.time_assumed ? 1 : 0,
        data.done_at ?? null,
        data.notes ?? '',
        now,
        now,
      ],
    );
    return (await this.getById(id))!;
  }

  async markDone(id: string, doneAt: string | null = nowIso()): Promise<void> {
    await this.executor.execute('UPDATE milestone SET done_at = ?, updated_at = ? WHERE id = ?', [
      doneAt,
      nowIso(),
      id,
    ]);
  }

  async softDelete(id: string): Promise<void> {
    await this.executor.execute(
      'UPDATE milestone SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [nowIso(), nowIso(), id],
    );
  }
}

export class ChecklistItemRepository {
  constructor(private readonly executor: Executor) {}

  async listByApplication(applicationId: string, includeDeleted = false): Promise<ChecklistItem[]> {
    const query = includeDeleted
      ? 'SELECT * FROM checklist_item WHERE application_id = ? ORDER BY sort_order ASC, created_at ASC'
      : 'SELECT * FROM checklist_item WHERE application_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC';
    const rows = await this.executor.select<Record<string, unknown>>(query, [applicationId]);
    return rows.map((r) => ChecklistItemSchema.parse(r));
  }

  async create(data: CreateChecklistItemData): Promise<ChecklistItem> {
    const id = generateId();
    const now = nowIso();
    await this.executor.execute(
      `INSERT INTO checklist_item (
         id, application_id, kind, label, status, due_offset_days, due_local, tz,
         document_id, test_score_id, notes, sort_order, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.application_id,
        data.kind,
        data.label,
        data.status ?? 'todo',
        data.due_offset_days ?? null,
        data.due_local ?? null,
        data.tz ?? null,
        data.document_id ?? null,
        data.test_score_id ?? null,
        data.notes ?? '',
        data.sort_order ?? 0,
        now,
        now,
      ],
    );
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM checklist_item WHERE id = ?',
      [id],
    );
    return ChecklistItemSchema.parse(rows[0]!);
  }

  async updateStatus(id: string, status: ChecklistItemStatus): Promise<void> {
    await this.executor.execute(
      'UPDATE checklist_item SET status = ?, updated_at = ? WHERE id = ?',
      [status, nowIso(), id],
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.executor.execute(
      'UPDATE checklist_item SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [nowIso(), nowIso(), id],
    );
  }
}

export class ContactRepository {
  constructor(private readonly executor: Executor) {}

  async list(kind?: ContactKind, includeDeleted = false): Promise<Contact[]> {
    let query = 'SELECT * FROM contact WHERE 1=1';
    const params: unknown[] = [];

    if (!includeDeleted) {
      query += ' AND deleted_at IS NULL';
    }
    if (kind) {
      query += ' AND kind = ?';
      params.push(kind);
    }
    query += ' ORDER BY name ASC';

    const rows = await this.executor.select<Record<string, unknown>>(query, params);
    return rows.map((r) => ContactSchema.parse(r));
  }

  async getById(id: string): Promise<Contact | null> {
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM contact WHERE id = ?',
      [id],
    );
    const first = rows[0];
    return first ? ContactSchema.parse(first) : null;
  }

  async create(data: CreateContactData): Promise<Contact> {
    const id = generateId();
    const now = nowIso();
    await this.executor.execute(
      `INSERT INTO contact (
         id, kind, name, email, title, affiliation, university_id, website,
         notes, outreach_status, next_follow_up_on, intro_via, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.kind ?? 'faculty',
        data.name,
        data.email ?? '',
        data.title ?? '',
        data.affiliation ?? '',
        data.university_id ?? null,
        data.website ?? '',
        data.notes ?? '',
        data.outreach_status ?? 'not_contacted',
        data.next_follow_up_on ?? null,
        data.intro_via ?? '',
        now,
        now,
      ],
    );
    return (await this.getById(id))!;
  }

  async softDelete(id: string): Promise<void> {
    await this.executor.execute('UPDATE contact SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      nowIso(),
      nowIso(),
      id,
    ]);
  }
}

export class LetterRequestRepository {
  constructor(private readonly executor: Executor) {}

  async listByApplication(applicationId: string, includeDeleted = false): Promise<LetterRequest[]> {
    const query = includeDeleted
      ? 'SELECT * FROM letter_request WHERE application_id = ?'
      : 'SELECT * FROM letter_request WHERE application_id = ? AND deleted_at IS NULL';
    const rows = await this.executor.select<Record<string, unknown>>(query, [applicationId]);
    return rows.map((r) => LetterRequestSchema.parse(r));
  }

  async listByContact(contactId: string, includeDeleted = false): Promise<LetterRequest[]> {
    const query = includeDeleted
      ? 'SELECT * FROM letter_request WHERE contact_id = ?'
      : 'SELECT * FROM letter_request WHERE contact_id = ? AND deleted_at IS NULL';
    const rows = await this.executor.select<Record<string, unknown>>(query, [contactId]);
    return rows.map((r) => LetterRequestSchema.parse(r));
  }

  async listAll(includeDeleted = false): Promise<LetterRequest[]> {
    const query = includeDeleted
      ? 'SELECT * FROM letter_request'
      : 'SELECT * FROM letter_request WHERE deleted_at IS NULL';
    const rows = await this.executor.select<Record<string, unknown>>(query);
    return rows.map((r) => LetterRequestSchema.parse(r));
  }

  async upsert(data: CreateLetterRequestData): Promise<void> {
    const now = nowIso();
    const rows = await this.executor.select<{ id: string }>(
      'SELECT id FROM letter_request WHERE application_id = ? AND contact_id = ?',
      [data.application_id, data.contact_id],
    );

    if (rows[0]) {
      await this.executor.execute(
        `UPDATE letter_request SET
           status = ?, asked_on = ?, link_sent_on = ?, submitted_on = ?,
           last_reminded_on = ?, waived_right_to_view = ?, notes = ?, updated_at = ?, deleted_at = NULL
         WHERE id = ?`,
        [
          data.status ?? 'not_requested',
          data.asked_on ?? null,
          data.link_sent_on ?? null,
          data.submitted_on ?? null,
          data.last_reminded_on ?? null,
          data.waived_right_to_view ? 1 : 0,
          data.notes ?? '',
          now,
          rows[0].id,
        ],
      );
    } else {
      await this.executor.execute(
        `INSERT INTO letter_request (
           id, application_id, contact_id, status, asked_on, link_sent_on,
           submitted_on, last_reminded_on, waived_right_to_view, notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          data.application_id,
          data.contact_id,
          data.status ?? 'not_requested',
          data.asked_on ?? null,
          data.link_sent_on ?? null,
          data.submitted_on ?? null,
          data.last_reminded_on ?? null,
          data.waived_right_to_view ? 1 : 0,
          data.notes ?? '',
          now,
          now,
        ],
      );
    }
  }

  async updateStatus(id: string, status: LetterRequestStatus): Promise<void> {
    const now = nowIso();
    const submittedOn = status === 'submitted' || status === 'confirmed_received' ? now : null;
    await this.executor.execute(
      `UPDATE letter_request SET
         status = ?,
         submitted_on = COALESCE(submitted_on, ?),
         updated_at = ?
       WHERE id = ?`,
      [status, submittedOn, now, id],
    );
  }
}

export class SettingRepository {
  constructor(private readonly executor: Executor) {}

  async get(key: string, defaultValue = ''): Promise<string> {
    const rows = await this.executor.select<Setting>('SELECT * FROM setting WHERE key = ?', [key]);
    return rows[0]?.value ?? defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    const now = nowIso();
    const existing = await this.executor.select<Setting>('SELECT * FROM setting WHERE key = ?', [
      key,
    ]);
    if (existing[0]) {
      await this.executor.execute('UPDATE setting SET value = ?, updated_at = ? WHERE key = ?', [
        value,
        now,
        key,
      ]);
    } else {
      await this.executor.execute(
        'INSERT INTO setting (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [key, value, now, now],
      );
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.executor.select<Setting>('SELECT * FROM setting');
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }
}

export class ReminderLogRepository {
  constructor(private readonly executor: Executor) {}

  async list(): Promise<ReminderLog[]> {
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM reminder_log ORDER BY shown_at DESC',
    );
    return rows.map((r) => ReminderLogSchema.parse(r));
  }

  async recordShown(itemKey: string, leadDays: number, shownAt = nowIso()): Promise<void> {
    await this.executor.execute(
      `INSERT INTO reminder_log (id, item_key, lead_days, shown_at, snoozed_until, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      [generateId(), itemKey, leadDays, shownAt, shownAt, shownAt],
    );
  }

  async snooze(itemKey: string, snoozedUntil: string): Promise<void> {
    await this.executor.execute(
      'UPDATE reminder_log SET snoozed_until = ?, updated_at = ? WHERE item_key = ?',
      [snoozedUntil, nowIso(), itemKey],
    );
  }
}

export class OfferRepository {
  constructor(private readonly executor: Executor) {}

  async getByApplicationId(applicationId: string): Promise<Offer | null> {
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM offer WHERE application_id = ? AND deleted_at IS NULL',
      [applicationId],
    );
    const first = rows[0];
    return first ? OfferSchema.parse(first) : null;
  }

  async create(data: CreateOfferData): Promise<Offer> {
    const id = generateId();
    const now = nowIso();
    await this.executor.execute(
      `INSERT INTO offer (
         id, application_id, funding_type, stipend_amount, stipend_period,
         currency, tuition, health_insurance, years_guaranteed, fees_not_covered,
         other_terms, letter_path, response_due_local, response_tz, decision,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.application_id,
        data.funding_type ?? 'none',
        data.stipend_amount ?? null,
        data.stipend_period ?? 'year',
        data.currency ?? 'USD',
        data.tuition ?? 'none',
        data.health_insurance ?? 'none',
        data.years_guaranteed ?? null,
        data.fees_not_covered ?? '',
        data.other_terms ?? '',
        data.letter_path ?? '',
        data.response_due_local ?? null,
        data.response_tz ?? null,
        data.decision ?? 'pending',
        now,
        now,
      ],
    );
    const rows = await this.executor.select<Record<string, unknown>>(
      'SELECT * FROM offer WHERE id = ?',
      [id],
    );
    return OfferSchema.parse(rows[0]!);
  }
}
