import { z } from 'zod';

// Enums
export const ApplicationStatusSchema = z.enum([
  'Exploring',
  'Applying',
  'Submitted',
  'Interviewing',
  'Admitted',
  'Waitlisted',
  'Rejected',
  'Accepted',
  'Declined',
  'Withdrawn',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const DegreeTypeSchema = z.enum(['phd', 'ms', 'other']);
export type DegreeType = z.infer<typeof DegreeTypeSchema>;

export const FacultyContactPolicySchema = z.enum([
  'encouraged',
  'neutral',
  'discouraged',
  'unknown',
]);
export type FacultyContactPolicy = z.infer<typeof FacultyContactPolicySchema>;

export const WaiverRouteSchema = z.enum(['none', 'central', 'department']);
export type WaiverRoute = z.infer<typeof WaiverRouteSchema>;

export const WaiverStatusSchema = z.enum([
  'not_applicable',
  'eligible',
  'requested',
  'granted',
  'denied',
]);
export type WaiverStatus = z.infer<typeof WaiverStatusSchema>;

export const MilestoneKindSchema = z.enum([
  'application',
  'priority',
  'fee_waiver',
  'letters',
  'scores',
  'interview',
  'response',
  'other',
]);
export type MilestoneKind = z.infer<typeof MilestoneKindSchema>;

export const ChecklistItemKindSchema = z.enum([
  'sop',
  'personal_statement',
  'cv',
  'writing_sample',
  'transcript',
  'test_scores',
  'english_test',
  'fee',
  'portal_form',
  'other',
]);
export type ChecklistItemKind = z.infer<typeof ChecklistItemKindSchema>;

export const ChecklistItemStatusSchema = z.enum(['todo', 'in_progress', 'done', 'not_required']);
export type ChecklistItemStatus = z.infer<typeof ChecklistItemStatusSchema>;

export const ContactKindSchema = z.enum(['recommender', 'faculty', 'staff', 'other']);
export type ContactKind = z.infer<typeof ContactKindSchema>;

export const OutreachStatusSchema = z.enum([
  'not_contacted',
  'emailed',
  'replied_positive',
  'replied_neutral',
  'replied_no',
  'meeting_set',
  'met',
]);
export type OutreachStatus = z.infer<typeof OutreachStatusSchema>;

export const LetterRequestStatusSchema = z.enum([
  'not_requested',
  'asked',
  'link_sent',
  'submitted',
  'confirmed_received',
  'declined',
]);
export type LetterRequestStatus = z.infer<typeof LetterRequestStatusSchema>;

export const FacultyRoleSchema = z.enum(['potential_advisor', 'named_in_application']);
export type FacultyRole = z.infer<typeof FacultyRoleSchema>;

export const InteractionChannelSchema = z.enum(['email', 'meeting', 'call', 'other']);
export type InteractionChannel = z.infer<typeof InteractionChannelSchema>;

export const InteractionDirectionSchema = z.enum(['sent', 'received']);
export type InteractionDirection = z.infer<typeof InteractionDirectionSchema>;

export const TestTypeSchema = z.enum(['gre', 'toefl', 'ielts', 'duolingo', 'other']);
export type TestType = z.infer<typeof TestTypeSchema>;

export const FundingTypeSchema = z.enum(['fellowship', 'ta', 'ra', 'mixed', 'none']);
export type FundingType = z.infer<typeof FundingTypeSchema>;

export const StipendPeriodSchema = z.enum(['year', 'semester', 'month']);
export type StipendPeriod = z.infer<typeof StipendPeriodSchema>;

export const CoverageTypeSchema = z.enum(['full', 'partial', 'none']);
export type CoverageType = z.infer<typeof CoverageTypeSchema>;

export const DecisionTypeSchema = z.enum(['pending', 'accepted', 'declined']);
export type DecisionType = z.infer<typeof DecisionTypeSchema>;

export const TemplateKindSchema = z.enum(['checklist', 'email']);
export type TemplateKind = z.infer<typeof TemplateKindSchema>;

// Entities
export const UniversitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  country: z.string().default(''),
  city: z.string().default(''),
  tz: z.string().min(1),
  website: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type University = z.infer<typeof UniversitySchema>;
export type UniversityInput = z.input<typeof UniversitySchema>;

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  university_id: z.string().uuid(),
  program: z.string().min(1),
  department: z.string().default(''),
  degree: DegreeTypeSchema.default('phd'),
  term: z.string().default(''),
  status: ApplicationStatusSchema.default('Exploring'),
  priority: z.number().int().min(1).max(3).default(2),
  fit: z.number().int().min(1).max(5).default(3),
  tags: z.string().default('[]'),
  program_url: z.string().default(''),
  portal_url: z.string().default(''),
  portal_username: z.string().default(''),
  faculty_contact_policy: FacultyContactPolicySchema.default('unknown'),
  fee_amount: z.number().nullable().optional(),
  fee_currency: z.string().default('USD'),
  fee_paid_on: z.string().nullable().optional(),
  waiver_route: WaiverRouteSchema.default('none'),
  waiver_status: WaiverStatusSchema.default('not_applicable'),
  submitted_at: z.string().nullable().optional(),
  notes: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationInput = z.input<typeof ApplicationSchema>;

export const MilestoneSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  kind: MilestoneKindSchema,
  label: z.string().min(1),
  due_local: z.string().min(1),
  tz: z.string().min(1),
  time_assumed: z
    .union([z.boolean(), z.number()])
    .default(false)
    .transform((val) => Boolean(val)),
  done_at: z.string().nullable().optional(),
  notes: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;
export type MilestoneInput = z.input<typeof MilestoneSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  kind: ChecklistItemKindSchema,
  label: z.string().min(1),
  status: ChecklistItemStatusSchema.default('todo'),
  due_offset_days: z.number().int().nullable().optional(),
  due_local: z.string().nullable().optional(),
  tz: z.string().nullable().optional(),
  document_id: z.string().nullable().optional(),
  test_score_id: z.string().nullable().optional(),
  notes: z.string().default(''),
  sort_order: z.number().int().default(0),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type ChecklistItemInput = z.input<typeof ChecklistItemSchema>;

export const ContactSchema = z.object({
  id: z.string().uuid(),
  kind: ContactKindSchema.default('faculty'),
  name: z.string().min(1),
  email: z.string().default(''),
  title: z.string().default(''),
  affiliation: z.string().default(''),
  university_id: z.string().uuid().nullable().optional(),
  website: z.string().default(''),
  notes: z.string().default(''),
  outreach_status: OutreachStatusSchema.default('not_contacted'),
  next_follow_up_on: z.string().nullable().optional(),
  intro_via: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;
export type ContactInput = z.input<typeof ContactSchema>;

export const LetterRequestSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  status: LetterRequestStatusSchema.default('not_requested'),
  asked_on: z.string().nullable().optional(),
  link_sent_on: z.string().nullable().optional(),
  submitted_on: z.string().nullable().optional(),
  last_reminded_on: z.string().nullable().optional(),
  waived_right_to_view: z
    .union([z.boolean(), z.number()])
    .default(true)
    .transform((val) => Boolean(val)),
  notes: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type LetterRequest = z.infer<typeof LetterRequestSchema>;
export type LetterRequestInput = z.input<typeof LetterRequestSchema>;

export const FacultyLinkSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  role: FacultyRoleSchema.default('potential_advisor'),
  notes: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type FacultyLink = z.infer<typeof FacultyLinkSchema>;
export type FacultyLinkInput = z.input<typeof FacultyLinkSchema>;

export const InteractionSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  application_id: z.string().uuid().nullable().optional(),
  occurred_on: z.string(),
  channel: InteractionChannelSchema.default('email'),
  direction: InteractionDirectionSchema.default('sent'),
  summary: z.string().min(1),
  follow_up_on: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type Interaction = z.infer<typeof InteractionSchema>;
export type InteractionInput = z.input<typeof InteractionSchema>;

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  kind: z.string().min(1),
  title: z.string().min(1),
  version_label: z.string().default('v1'),
  file_path: z.string().min(1),
  notes: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentInput = z.input<typeof DocumentSchema>;

export const TestScoreSchema = z.object({
  id: z.string().uuid(),
  test: TestTypeSchema,
  taken_on: z.string(),
  total: z.string(),
  sections: z.string().default('{}'),
  valid_until: z.string(),
  notes: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type TestScore = z.infer<typeof TestScoreSchema>;
export type TestScoreInput = z.input<typeof TestScoreSchema>;

export const OfferSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  funding_type: FundingTypeSchema.default('none'),
  stipend_amount: z.number().nullable().optional(),
  stipend_period: StipendPeriodSchema.default('year'),
  currency: z.string().default('USD'),
  tuition: CoverageTypeSchema.default('none'),
  health_insurance: CoverageTypeSchema.default('none'),
  years_guaranteed: z.number().int().nullable().optional(),
  fees_not_covered: z.string().default(''),
  other_terms: z.string().default(''),
  letter_path: z.string().default(''),
  response_due_local: z.string().nullable().optional(),
  response_tz: z.string().nullable().optional(),
  decision: DecisionTypeSchema.default('pending'),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type Offer = z.infer<typeof OfferSchema>;
export type OfferInput = z.input<typeof OfferSchema>;

export const StatusChangeSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  from_status: z.string(),
  to_status: z.string(),
  changed_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StatusChange = z.infer<typeof StatusChangeSchema>;

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  kind: TemplateKindSchema,
  name: z.string().min(1),
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});
export type Template = z.infer<typeof TemplateSchema>;
export type TemplateInput = z.input<typeof TemplateSchema>;

export const ReminderLogSchema = z.object({
  id: z.string().uuid(),
  item_key: z.string(),
  lead_days: z.number().int(),
  shown_at: z.string(),
  snoozed_until: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ReminderLog = z.infer<typeof ReminderLogSchema>;

export const SettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Setting = z.infer<typeof SettingSchema>;
