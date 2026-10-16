import type { Repositories } from '../db/repositories';
import { createApplicationWithDefaults } from '../services/application-service';

export interface UserDataPayload {
  universities?: Array<{
    name: string;
    country?: string;
    city?: string;
    tz?: string;
    website?: string;
  }>;
  faculty?: Array<{
    name: string;
    title?: string;
    affiliation?: string;
    university_name?: string;
    email?: string;
    website?: string;
    outreach_status?:
      | 'not_contacted'
      | 'emailed'
      | 'replied_positive'
      | 'replied_neutral'
      | 'replied_no'
      | 'meeting_set'
      | 'met';
    next_follow_up_on?: string;
    notes?: string;
    interaction?: {
      occurred_on: string;
      channel?: 'email' | 'meeting' | 'call' | 'other';
      direction?: 'sent' | 'received';
      summary: string;
      follow_up_on?: string;
    };
  }>;
  applications?: Array<{
    university_name: string;
    program: string;
    department?: string;
    degree?: 'phd' | 'ms' | 'other';
    term?: string;
    deadline_date: string;
    deadline_time?: string;
    deadline_tz?: string;
    priority?: 1 | 2 | 3;
    faculty_contact_policy?: 'encouraged' | 'neutral' | 'discouraged' | 'unknown';
    advisor_name?: string;
    notes?: string;
  }>;
}

// Dynamically check if local user-data.json is present (omitted in CI / clean repo)
const userModules = import.meta.glob<Record<string, unknown>>(
  ['../../user-data.json', '/src/user-data.json'],
  { eager: true },
);

export function getUserData(): UserDataPayload | null {
  for (const key of Object.keys(userModules)) {
    const mod = userModules[key];
    if (!mod) continue;
    if ('default' in mod && mod.default && typeof mod.default === 'object') {
      return mod.default as UserDataPayload;
    }
    if ('faculty' in mod || 'applications' in mod || 'universities' in mod) {
      return mod as unknown as UserDataPayload;
    }
  }
  return null;
}

export function hasUserData(): boolean {
  return getUserData() !== null;
}

export async function loadUserData(repos: Repositories): Promise<boolean> {
  const data = getUserData();
  if (!data) return false;

  // 1. Create or resolve universities
  const uniMap = new Map<string, string>();
  if (data.universities) {
    for (const u of data.universities) {
      const existing = (await repos.universities.list()).find(
        (x) => x.name.toLowerCase() === u.name.toLowerCase(),
      );
      if (existing) {
        uniMap.set(u.name, existing.id);
      } else {
        const created = await repos.universities.create({
          name: u.name,
          country: u.country ?? 'United States',
          city: u.city ?? '',
          tz: u.tz ?? 'America/New_York',
          website: u.website ?? '',
        });
        uniMap.set(u.name, created.id);
      }
    }
  }

  // 2. Create faculty contacts and log interactions
  const contactMap = new Map<string, string>();
  if (data.faculty) {
    for (const f of data.faculty) {
      let uniId: string | undefined;
      if (f.university_name) {
        uniId = uniMap.get(f.university_name);
      }

      const existingContact = (await repos.contacts.list('faculty')).find(
        (c) => c.name.toLowerCase() === f.name.toLowerCase(),
      );

      let contactId: string;
      if (existingContact) {
        contactId = existingContact.id;
        await repos.contacts.update(contactId, {
          title: f.title ?? existingContact.title,
          affiliation: f.affiliation ?? existingContact.affiliation,
          email: f.email ?? existingContact.email,
          website: f.website ?? existingContact.website,
          outreach_status: f.outreach_status ?? existingContact.outreach_status,
          next_follow_up_on: f.next_follow_up_on ?? existingContact.next_follow_up_on,
          notes: f.notes ?? existingContact.notes,
        });
      } else {
        const created = await repos.contacts.create({
          kind: 'faculty',
          name: f.name,
          title: f.title ?? '',
          affiliation: f.affiliation ?? '',
          university_id: uniId ?? null,
          email: f.email ?? '',
          website: f.website ?? '',
          outreach_status: f.outreach_status ?? 'emailed',
          next_follow_up_on: f.next_follow_up_on ?? null,
          notes: f.notes ?? '',
        });
        contactId = created.id;
      }
      contactMap.set(f.name, contactId);

      // Log interaction if present
      if (f.interaction) {
        const existingInteractions = await repos.interactions.listByContact(contactId);
        const alreadyLogged = existingInteractions.some(
          (i) => i.occurred_on === f.interaction!.occurred_on,
        );
        if (!alreadyLogged) {
          await repos.interactions.create({
            contact_id: contactId,
            occurred_on: f.interaction.occurred_on,
            channel: f.interaction.channel ?? 'email',
            direction: f.interaction.direction ?? 'sent',
            summary: f.interaction.summary,
            follow_up_on: f.interaction.follow_up_on ?? null,
          });
        }
      }
    }
  }

  // 3. Create applications with defaults and link faculty
  if (data.applications) {
    for (const a of data.applications) {
      const existingApp = (await repos.applications.list()).find(
        (app) => app.program.toLowerCase() === a.program.toLowerCase(),
      );
      if (!existingApp) {
        const { application } = await createApplicationWithDefaults(repos, {
          university_name: a.university_name,
          program: a.program,
          department: a.department,
          degree: a.degree ?? 'phd',
          term: a.term ?? 'Fall 2027',
          deadline_date: a.deadline_date,
          deadline_time: a.deadline_time ?? '23:59',
          deadline_tz: a.deadline_tz ?? 'America/New_York',
          priority: a.priority ?? 1,
          faculty_contact_policy: a.faculty_contact_policy ?? 'encouraged',
          notes: a.notes ?? '',
        });

        // Link advisor if specified
        if (a.advisor_name && contactMap.has(a.advisor_name)) {
          const contactId = contactMap.get(a.advisor_name)!;
          await repos.facultyLinks.link({
            application_id: application.id,
            contact_id: contactId,
            role: 'potential_advisor',
            notes: 'Contacted advisor',
          });
        }
      }
    }
  }

  return true;
}
