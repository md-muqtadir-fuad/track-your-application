import { DateTime } from 'luxon';
import type { Repositories } from '../db/repositories';
import type {
  Application,
  Milestone,
  ChecklistItem,
  LetterRequest,
  ChecklistItemKind,
} from '../db/schema';
import { parseWallClock } from '../time';

export interface DefaultChecklistTemplateItem {
  kind: ChecklistItemKind;
  label: string;
  due_offset_days?: number | null;
  required: boolean;
}

export const DEFAULT_CHECKLIST_TEMPLATE: DefaultChecklistTemplateItem[] = [
  { kind: 'sop', label: 'Statement of Purpose', required: true },
  { kind: 'personal_statement', label: 'Personal Statement', required: false },
  { kind: 'cv', label: 'Curriculum Vitae (CV)', required: true },
  { kind: 'transcript', label: 'Transcripts', required: true },
  {
    kind: 'test_scores',
    label: 'Send Official GRE Scores',
    due_offset_days: -10,
    required: false,
  },
  {
    kind: 'english_test',
    label: 'Send Official TOEFL / IELTS Report',
    due_offset_days: -10,
    required: true,
  },
  {
    kind: 'fee',
    label: 'Pay Application Fee or Secure Waiver',
    due_offset_days: -14,
    required: true,
  },
  { kind: 'portal_form', label: 'Complete & Submit Portal Form', required: true },
];

export interface CreateApplicationPayload {
  university_id?: string;
  university_name?: string;
  university_tz?: string;
  university_country?: string;
  university_city?: string;
  program: string;
  department?: string;
  degree?: 'phd' | 'ms' | 'other';
  term?: string;
  deadline_date: string; // YYYY-MM-DD
  deadline_time?: string; // HH:mm (optional, defaults to 23:59)
  deadline_tz?: string;
  priority?: 1 | 2 | 3;
  fit?: 1 | 2 | 3 | 4 | 5;
  program_url?: string;
  portal_url?: string;
  portal_username?: string;
  faculty_contact_policy?: 'encouraged' | 'neutral' | 'discouraged' | 'unknown';
  fee_amount?: number | null;
  fee_currency?: string;
  waiver_route?: 'none' | 'central' | 'department';
  waiver_status?: 'not_applicable' | 'eligible' | 'requested' | 'granted' | 'denied';
  notes?: string;
}

export async function createApplicationWithDefaults(
  repos: Repositories,
  payload: CreateApplicationPayload,
): Promise<{ application: Application; milestone: Milestone }> {
  // 1. Resolve or create university
  let universityId = payload.university_id;
  let schoolTz = payload.deadline_tz ?? payload.university_tz ?? 'America/New_York';

  if (!universityId && payload.university_name) {
    const existingUnis = await repos.universities.list();
    const match = existingUnis.find(
      (u) => u.name.toLowerCase() === payload.university_name!.trim().toLowerCase(),
    );
    if (match) {
      universityId = match.id;
      schoolTz = match.tz;
    } else {
      const createdUni = await repos.universities.create({
        name: payload.university_name.trim(),
        country: payload.university_country ?? 'USA',
        city: payload.university_city ?? '',
        tz: payload.university_tz ?? payload.deadline_tz ?? 'America/New_York',
      });
      universityId = createdUni.id;
      schoolTz = createdUni.tz;
    }
  }

  if (!universityId) {
    throw new Error('A university is required.');
  }

  // 2. Resolve deadline time & time_assumed flag
  const timeAssumed = !payload.deadline_time || payload.deadline_time.trim() === '';
  const resolvedTime = timeAssumed ? '23:59' : payload.deadline_time!.trim();
  const dueLocal = `${payload.deadline_date.trim()}T${resolvedTime}`;

  // 3. Create application
  const application = await repos.applications.create({
    university_id: universityId,
    program: payload.program.trim(),
    department: payload.department?.trim() ?? '',
    degree: payload.degree ?? 'phd',
    term: payload.term?.trim() ?? 'Fall 2027',
    status: 'Exploring',
    priority: payload.priority ?? 2,
    fit: payload.fit ?? 3,
    tags: '[]',
    program_url: payload.program_url?.trim() ?? '',
    portal_url: payload.portal_url?.trim() ?? '',
    portal_username: payload.portal_username?.trim() ?? '',
    faculty_contact_policy: payload.faculty_contact_policy ?? 'unknown',
    fee_amount: payload.fee_amount ?? null,
    fee_currency: payload.fee_currency ?? 'USD',
    waiver_route: payload.waiver_route ?? 'none',
    waiver_status: payload.waiver_status ?? 'not_applicable',
    notes: payload.notes?.trim() ?? '',
  });

  // 4. Create primary application milestone
  const milestone = await repos.milestones.create({
    application_id: application.id,
    kind: 'application',
    label: 'Application Deadline',
    due_local: dueLocal,
    tz: schoolTz,
    time_assumed: timeAssumed,
    notes: timeAssumed ? 'Time assumed. Check the program page.' : '',
  });

  // 5. Apply default checklist template
  for (let i = 0; i < DEFAULT_CHECKLIST_TEMPLATE.length; i++) {
    const item = DEFAULT_CHECKLIST_TEMPLATE[i]!;
    await repos.checklistItems.create({
      application_id: application.id,
      kind: item.kind,
      label: item.label,
      status: item.required ? 'todo' : 'not_required',
      due_offset_days: item.due_offset_days ?? null,
      sort_order: i,
    });
  }

  // 6. Attach default recommenders from settings (if any exist)
  const defaultRecommenderSetting = await repos.settings.get('default_recommenders', '');
  if (defaultRecommenderSetting) {
    const recommenderIds = defaultRecommenderSetting
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const recId of recommenderIds) {
      await repos.letterRequests.upsert({
        application_id: application.id,
        contact_id: recId,
        status: 'not_requested',
        waived_right_to_view: true,
      });
    }
  }

  return { application, milestone };
}

/**
 * Computes application readiness percentage (0 - 100):
 * Readiness = (completed required checklist items + submitted/confirmed letters) / (total required items)
 */
export function calculateReadiness(
  checklistItems: ChecklistItem[],
  letterRequests: LetterRequest[],
): number {
  const activeItems = checklistItems.filter((i) => !i.deleted_at);
  const activeLetters = letterRequests.filter((l) => !l.deleted_at);

  // Required checklist items are those that are not marked 'not_required'
  const requiredChecklist = activeItems.filter((i) => i.status !== 'not_required');
  const completedChecklist = requiredChecklist.filter((i) => i.status === 'done');

  // Letters: each letter request counts as a required item unless declined
  const nonDeclinedLetters = activeLetters.filter((l) => l.status !== 'declined');
  const submittedLetters = nonDeclinedLetters.filter(
    (l) => l.status === 'submitted' || l.status === 'confirmed_received',
  );

  const totalRequired = requiredChecklist.length + nonDeclinedLetters.length;
  if (totalRequired === 0) return 100;

  const completed = completedChecklist.length + submittedLetters.length;
  return Math.min(100, Math.round((completed / totalRequired) * 100));
}

/**
 * Computes whether an application is "at-risk":
 * - Deadline within 14 days and readiness under 80%
 * - OR a letter not submitted within 7 days of its due date (or application deadline)
 */
export function isAtRisk(
  application: Application,
  deadlineMilestone: Milestone | null | undefined,
  readiness: number,
  letterRequests: LetterRequest[],
  now: DateTime<boolean> = DateTime.now(),
): { atRisk: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Terminal / submitted applications are not at risk
  if (
    application.status === 'Submitted' ||
    application.status === 'Admitted' ||
    application.status === 'Accepted' ||
    application.status === 'Declined' ||
    application.status === 'Withdrawn' ||
    application.status === 'Rejected'
  ) {
    return { atRisk: false, reasons: [] };
  }

  if (deadlineMilestone) {
    const deadlineLuxon = parseWallClock(deadlineMilestone.due_local, deadlineMilestone.tz);
    const daysUntilDeadline = deadlineLuxon.diff(now, 'days').days;

    if (daysUntilDeadline > 0 && daysUntilDeadline <= 14 && readiness < 80) {
      reasons.push(
        `Deadline is in ${Math.ceil(daysUntilDeadline)} days and readiness is only ${readiness}%.`,
      );
    }

    // Letter check: not submitted within 7 days of deadline
    const pendingLetters = letterRequests.filter(
      (l) =>
        !l.deleted_at &&
        l.status !== 'submitted' &&
        l.status !== 'confirmed_received' &&
        l.status !== 'declined',
    );

    if (daysUntilDeadline > 0 && daysUntilDeadline <= 7 && pendingLetters.length > 0) {
      reasons.push(
        `${pendingLetters.length} letter recommendation(s) still unsubmitted within 7 days of deadline.`,
      );
    }
  }

  return {
    atRisk: reasons.length > 0,
    reasons,
  };
}
