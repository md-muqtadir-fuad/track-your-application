import type { Repositories } from '../db/repositories';

export interface FullBackupPayload {
  version: number;
  exported_at: string;
  universities: unknown[];
  applications: unknown[];
  milestones: unknown[];
  checklist_items: unknown[];
  contacts: unknown[];
  letter_requests: unknown[];
  faculty_links: unknown[];
  interactions: unknown[];
  documents: unknown[];
  test_scores: unknown[];
  offers: unknown[];
  status_changes: unknown[];
  settings: Record<string, string>;
}

export async function exportDatabaseToJson(repos: Repositories): Promise<string> {
  const [unis, apps, ms, cl, contacts, lrs, fls, inters, docs, scores, offers, changes, settings] =
    await Promise.all([
      repos.universities.list(true),
      repos.applications.list(true),
      repos.milestones.listAll(true),
      repos.checklistItems.listAll(true),
      repos.contacts.list(undefined, true),
      repos.letterRequests.listAll(true),
      repos.facultyLinks.listByApplication('', true),
      repos.interactions.listRecent(1000, true),
      repos.documents.list(true),
      repos.testScores.list(true),
      repos.offers.listAll(true),
      repos.statusChanges.listByApplication(''),
      repos.settings.getAll(),
    ]);

  const payload: FullBackupPayload = {
    version: 1,
    exported_at: new Date().toISOString(),
    universities: unis,
    applications: apps,
    milestones: ms,
    checklist_items: cl,
    contacts,
    letter_requests: lrs,
    faculty_links: fls,
    interactions: inters,
    documents: docs,
    test_scores: scores,
    offers,
    status_changes: changes,
    settings,
  };

  return JSON.stringify(payload, null, 2);
}

export async function exportApplicationsToCsv(repos: Repositories): Promise<string> {
  const [apps, unis, milestones] = await Promise.all([
    repos.applications.list(),
    repos.universities.list(),
    repos.milestones.listAll(),
  ]);

  const uniMap = new Map<string, string>();
  for (const u of unis) {
    uniMap.set(u.id, u.name);
  }

  const deadlineMap = new Map<string, { due: string; tz: string }>();
  for (const m of milestones) {
    if (m.kind === 'application' || !deadlineMap.has(m.application_id)) {
      deadlineMap.set(m.application_id, { due: m.due_local, tz: m.tz });
    }
  }

  const headers = [
    'University',
    'Program',
    'Department',
    'Degree',
    'Term',
    'Status',
    'Priority',
    'Deadline Local',
    'Institution Time Zone',
    'Portal URL',
    'Portal Username',
    'Fee',
    'Fee Currency',
    'Waiver Status',
    'Notes',
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = apps.map((a) => {
    const uniName = uniMap.get(a.university_id) ?? '';
    const dl = deadlineMap.get(a.id);
    return [
      escapeCsv(uniName),
      escapeCsv(a.program),
      escapeCsv(a.department),
      escapeCsv(a.degree),
      escapeCsv(a.term),
      escapeCsv(a.status),
      escapeCsv(a.priority),
      escapeCsv(dl?.due ?? ''),
      escapeCsv(dl?.tz ?? ''),
      escapeCsv(a.portal_url),
      escapeCsv(a.portal_username),
      escapeCsv(a.fee_amount ?? ''),
      escapeCsv(a.fee_currency),
      escapeCsv(a.waiver_status),
      escapeCsv(a.notes),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
