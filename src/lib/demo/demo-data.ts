import type { Executor } from '../db/executor';
import {
  UniversityRepository,
  ApplicationRepository,
  MilestoneRepository,
  ChecklistItemRepository,
  ContactRepository,
  LetterRequestRepository,
  SettingRepository,
} from '../db/repositories';

export async function loadDemoData(executor: Executor): Promise<void> {
  const universityRepo = new UniversityRepository(executor);
  const appRepo = new ApplicationRepository(executor);
  const milestoneRepo = new MilestoneRepository(executor);
  const checklistRepo = new ChecklistItemRepository(executor);
  const contactRepo = new ContactRepository(executor);
  const letterRepo = new LetterRequestRepository(executor);
  const settingRepo = new SettingRepository(executor);

  // Set default settings
  await settingRepo.set('my_timezone', 'Asia/Dhaka');
  await settingRepo.set('reminder_lead_days', '30,14,7,3,1');
  await settingRepo.set('default_deadline_time', '23:59');

  // 1. Universities
  const u1 = await universityRepo.create({
    name: 'Example State University',
    country: 'United States',
    city: 'Metropolis',
    tz: 'America/New_York',
    website: 'https://example.edu',
  });

  const u2 = await universityRepo.create({
    name: 'Fictional Institute of Technology',
    country: 'United States',
    city: 'Bay City',
    tz: 'America/Los_Angeles',
    website: 'https://fit.example.edu',
  });

  const u3 = await universityRepo.create({
    name: 'Desert Valley University',
    country: 'United States',
    city: 'Phoenix',
    tz: 'America/Phoenix',
    website: 'https://dvu.example.edu',
  });

  // 2. Recommenders and Faculty
  const rec1 = await contactRepo.create({
    kind: 'recommender',
    name: 'Dr. Ada Placeholder',
    email: 'ada.placeholder@example.edu',
    title: 'Associate Professor',
    affiliation: 'Undergrad Department of CS',
  });

  const rec2 = await contactRepo.create({
    kind: 'recommender',
    name: 'Prof. Charles Mock',
    email: 'charles.mock@example.edu',
    title: 'Professor & Dean',
    affiliation: 'Robotics Institute',
  });

  const rec3 = await contactRepo.create({
    kind: 'recommender',
    name: 'Dr. Grace Sample',
    email: 'grace.sample@example.edu',
    title: 'Senior Researcher',
    affiliation: 'AI Research Lab',
  });

  await contactRepo.create({
    kind: 'faculty',
    name: 'Prof. Alan Turing-Mock',
    email: 'alan.tmock@example.edu',
    title: 'Professor',
    affiliation: 'Example State University',
    university_id: u1.id,
    outreach_status: 'replied_positive',
    next_follow_up_on: '2026-11-15',
    intro_via: 'Introduced by Dr. Ada Placeholder',
  });

  // 3. Applications
  const app1 = await appRepo.create({
    university_id: u1.id,
    program: 'Computer Science',
    department: 'School of Computing',
    degree: 'phd',
    term: 'Fall 2027',
    status: 'Applying',
    priority: 1,
    fit: 5,
    tags: JSON.stringify(['AI', 'Systems', 'Top Choice']),
    program_url: 'https://example.edu/cs/phd',
    portal_url: 'https://apply.example.edu',
    portal_username: 'applicant_phd_2027',
    faculty_contact_policy: 'encouraged',
    fee_amount: 105,
    fee_currency: 'USD',
    waiver_route: 'department',
    waiver_status: 'requested',
    notes:
      'Primary interest: Distributed Systems & Autonomous Agents. Connected with Prof. Alan Turing-Mock.',
  });

  const app2 = await appRepo.create({
    university_id: u2.id,
    program: 'Robotics & Automation',
    department: 'Electrical Engineering & CS',
    degree: 'phd',
    term: 'Fall 2027',
    status: 'Exploring',
    priority: 2,
    fit: 4,
    tags: JSON.stringify(['Robotics', 'Control']),
    program_url: 'https://fit.example.edu/robotics',
    portal_url: 'https://grad-apply.fit.example.edu',
    portal_username: 'applicant_robotics',
    faculty_contact_policy: 'neutral',
    fee_amount: 120,
    fee_currency: 'USD',
    waiver_route: 'none',
    waiver_status: 'not_applicable',
    notes:
      'Does not allow changing recommenders after submission. Require all letters submitted by deadline.',
  });

  const app3 = await appRepo.create({
    university_id: u3.id,
    program: 'Artificial Intelligence',
    department: 'School of Computing',
    degree: 'phd',
    term: 'Fall 2027',
    status: 'Submitted',
    priority: 1,
    fit: 4,
    tags: JSON.stringify(['AI', 'Machine Learning']),
    program_url: 'https://dvu.example.edu/ai-phd',
    fee_amount: 90,
    fee_currency: 'USD',
    fee_paid_on: '2026-11-20',
    waiver_status: 'not_applicable',
    submitted_at: '2026-11-20T14:30:00Z',
    notes: 'Submitted early! Arizona has no DST (UTC-7 year round).',
  });

  // 4. Milestones
  await milestoneRepo.create({
    application_id: app1.id,
    kind: 'application',
    label: 'Application Deadline (Eastern Time)',
    due_local: '2026-12-15T23:59',
    tz: u1.tz,
    time_assumed: false,
  });

  await milestoneRepo.create({
    application_id: app2.id,
    kind: 'application',
    label: 'Application Deadline (8:59 PM Pacific)',
    due_local: '2026-12-15T20:59',
    tz: u2.tz,
    time_assumed: false,
  });

  await milestoneRepo.create({
    application_id: app2.id,
    kind: 'letters',
    label: 'Letters of Recommendation Due',
    due_local: '2026-12-05T20:59',
    tz: u2.tz,
    time_assumed: false,
  });

  await milestoneRepo.create({
    application_id: app3.id,
    kind: 'application',
    label: 'Priority Deadline (Mountain Standard)',
    due_local: '2026-12-01T23:59',
    tz: u3.tz,
    time_assumed: false,
    done_at: '2026-11-20T14:30:00Z',
  });

  // 5. Checklist Items
  await checklistRepo.create({
    application_id: app1.id,
    kind: 'sop',
    label: 'Statement of Purpose (Draft 3)',
    status: 'in_progress',
    sort_order: 1,
  });

  await checklistRepo.create({
    application_id: app1.id,
    kind: 'cv',
    label: 'Academic CV (2-page format)',
    status: 'done',
    sort_order: 2,
  });

  await checklistRepo.create({
    application_id: app1.id,
    kind: 'transcript',
    label: 'Official Undergraduate Transcripts',
    status: 'done',
    sort_order: 3,
  });

  await checklistRepo.create({
    application_id: app1.id,
    kind: 'english_test',
    label: 'IELTS / TOEFL score reporting (10 days prior)',
    status: 'todo',
    due_offset_days: 10,
    sort_order: 4,
  });

  // 6. Letter Requests
  await letterRepo.upsert({
    application_id: app1.id,
    contact_id: rec1.id,
    status: 'asked',
    asked_on: '2026-10-01',
    waived_right_to_view: true,
  });

  await letterRepo.upsert({
    application_id: app1.id,
    contact_id: rec2.id,
    status: 'link_sent',
    asked_on: '2026-10-01',
    link_sent_on: '2026-10-15',
    waived_right_to_view: true,
  });

  await letterRepo.upsert({
    application_id: app1.id,
    contact_id: rec3.id,
    status: 'submitted',
    asked_on: '2026-10-01',
    link_sent_on: '2026-10-15',
    submitted_on: '2026-10-25',
    waived_right_to_view: true,
  });
}

export async function removeDemoData(executor: Executor): Promise<void> {
  const tables = [
    'letter_request',
    'checklist_item',
    'milestone',
    'faculty_link',
    'interaction',
    'status_change',
    'offer',
    'application',
    'contact',
    'university',
  ];
  for (const table of tables) {
    await executor.execute(`DELETE FROM ${table}`);
  }
}

export const clearDemoData = removeDemoData;
