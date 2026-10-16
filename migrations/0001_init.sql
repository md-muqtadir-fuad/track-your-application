-- 0001_init.sql: Initial Schema for Track Your PhD Application

CREATE TABLE IF NOT EXISTS university (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  tz TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS application (
  id TEXT PRIMARY KEY NOT NULL,
  university_id TEXT NOT NULL REFERENCES university(id) ON DELETE CASCADE,
  program TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  degree TEXT NOT NULL DEFAULT 'phd',
  term TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Exploring',
  priority INTEGER NOT NULL DEFAULT 2,
  fit INTEGER NOT NULL DEFAULT 3,
  tags TEXT NOT NULL DEFAULT '[]',
  program_url TEXT NOT NULL DEFAULT '',
  portal_url TEXT NOT NULL DEFAULT '',
  portal_username TEXT NOT NULL DEFAULT '',
  faculty_contact_policy TEXT NOT NULL DEFAULT 'unknown',
  fee_amount REAL,
  fee_currency TEXT NOT NULL DEFAULT 'USD',
  fee_paid_on TEXT,
  waiver_route TEXT NOT NULL DEFAULT 'none',
  waiver_status TEXT NOT NULL DEFAULT 'not_applicable',
  submitted_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS milestone (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  due_local TEXT NOT NULL,
  tz TEXT NOT NULL,
  time_assumed INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS checklist_item (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  due_offset_days INTEGER,
  due_local TEXT,
  tz TEXT,
  document_id TEXT,
  test_score_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS contact (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'recommender',
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  affiliation TEXT NOT NULL DEFAULT '',
  university_id TEXT REFERENCES university(id) ON DELETE SET NULL,
  website TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  outreach_status TEXT NOT NULL DEFAULT 'not_contacted',
  next_follow_up_on TEXT,
  intro_via TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS letter_request (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_requested',
  asked_on TEXT,
  link_sent_on TEXT,
  submitted_on TEXT,
  last_reminded_on TEXT,
  waived_right_to_view INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE(application_id, contact_id)
);

CREATE TABLE IF NOT EXISTS faculty_link (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'potential_advisor',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE(application_id, contact_id)
);

CREATE TABLE IF NOT EXISTS interaction (
  id TEXT PRIMARY KEY NOT NULL,
  contact_id TEXT NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES application(id) ON DELETE SET NULL,
  occurred_on TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  direction TEXT NOT NULL DEFAULT 'sent',
  summary TEXT NOT NULL,
  follow_up_on TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS document (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  version_label TEXT NOT NULL DEFAULT 'v1',
  file_path TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS test_score (
  id TEXT PRIMARY KEY NOT NULL,
  test TEXT NOT NULL,
  taken_on TEXT NOT NULL,
  total TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '{}',
  valid_until TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS offer (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT UNIQUE NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  funding_type TEXT NOT NULL DEFAULT 'none',
  stipend_amount REAL,
  stipend_period TEXT NOT NULL DEFAULT 'year',
  currency TEXT NOT NULL DEFAULT 'USD',
  tuition TEXT NOT NULL DEFAULT 'none',
  health_insurance TEXT NOT NULL DEFAULT 'none',
  years_guaranteed INTEGER,
  fees_not_covered TEXT NOT NULL DEFAULT '',
  other_terms TEXT NOT NULL DEFAULT '',
  letter_path TEXT NOT NULL DEFAULT '',
  response_due_local TEXT,
  response_tz TEXT,
  decision TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS status_change (
  id TEXT PRIMARY KEY NOT NULL,
  application_id TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS template (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS reminder_log (
  id TEXT PRIMARY KEY NOT NULL,
  item_key TEXT NOT NULL,
  lead_days INTEGER NOT NULL,
  shown_at TEXT NOT NULL,
  snoozed_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS setting (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_university ON application(university_id);
CREATE INDEX IF NOT EXISTS idx_application_status ON application(status);
CREATE INDEX IF NOT EXISTS idx_milestone_application ON milestone(application_id);
CREATE INDEX IF NOT EXISTS idx_checklist_application ON checklist_item(application_id);
CREATE INDEX IF NOT EXISTS idx_contact_kind ON contact(kind);
CREATE INDEX IF NOT EXISTS idx_letter_application ON letter_request(application_id);
CREATE INDEX IF NOT EXISTS idx_letter_contact ON letter_request(contact_id);
CREATE INDEX IF NOT EXISTS idx_status_change_app ON status_change(application_id);
