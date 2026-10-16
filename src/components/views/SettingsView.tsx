import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Database,
  Download,
  Trash2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useDatabase } from '../../lib/db/context';
import { useToast } from '../ui/ToastContext';
import { PINNED_US_TIMEZONES } from '../../lib/time';
import {
  exportDatabaseToJson,
  exportApplicationsToCsv,
  triggerDownload,
} from '../../lib/data/export-import';
import type { Application, University, Contact } from '../../lib/db/schema';

export const SettingsView: React.FC = () => {
  const { repos, userTz, setUserTz, loadDemo, clearDemo, loadUser, refresh } = useDatabase();
  const { showToast } = useToast();

  const [defaultTime, setDefaultTime] = useState('23:59');
  const [reminderLeadDays, setReminderLeadDays] = useState('30, 14, 7, 3, 1');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');

  // Trash items
  const [deletedApps, setDeletedApps] = useState<Application[]>([]);
  const [deletedUnis, setDeletedUnis] = useState<University[]>([]);
  const [deletedContacts, setDeletedContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (!repos) return;
    Promise.all([
      repos.settings.get('default_deadline_time', '23:59'),
      repos.settings.get('reminder_lead_days', '30, 14, 7, 3, 1'),
      repos.settings.get('default_currency', 'USD'),
      repos.applications.list(true),
      repos.universities.list(true),
      repos.contacts.list(undefined, true),
    ]).then(([dTime, leads, curr, apps, unis, contacts]) => {
      setDefaultTime(dTime);
      setReminderLeadDays(leads);
      setDefaultCurrency(curr);
      setDeletedApps(apps.filter((a) => Boolean(a.deleted_at)));
      setDeletedUnis(unis.filter((u) => Boolean(u.deleted_at)));
      setDeletedContacts(contacts.filter((c) => Boolean(c.deleted_at)));
    });
  }, [repos]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repos) return;
    await repos.settings.set('default_deadline_time', defaultTime);
    await repos.settings.set('reminder_lead_days', reminderLeadDays);
    await repos.settings.set('default_currency', defaultCurrency);
    showToast({ message: 'Settings saved successfully.' });
    refresh();
  };

  const handleExportJson = async () => {
    if (!repos) return;
    const jsonStr = await exportDatabaseToJson(repos);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(`phd_tracker_backup_${dateStr}.json`, jsonStr, 'application/json');
    showToast({ message: 'Database backup downloaded (JSON).' });
  };

  const handleExportCsv = async () => {
    if (!repos) return;
    const csvStr = await exportApplicationsToCsv(repos);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(`phd_applications_${dateStr}.csv`, csvStr, 'text/csv');
    showToast({ message: 'Applications exported to CSV.' });
  };

  const handleRestoreApp = async (id: string) => {
    if (!repos) return;
    await repos.applications.restore(id);
    showToast({ message: 'Restored application from trash.' });
    refresh();
    const apps = await repos.applications.list(true);
    setDeletedApps(apps.filter((a) => Boolean(a.deleted_at)));
  };

  const handleRestoreContact = async (id: string) => {
    if (!repos) return;
    await repos.contacts.restore(id);
    showToast({ message: 'Restored contact from trash.' });
    refresh();
    const contacts = await repos.contacts.list(undefined, true);
    setDeletedContacts(contacts.filter((c) => Boolean(c.deleted_at)));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Time Zone & General Preferences */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Globe className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Time Zone & Display
          </h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              My Applicant Time Zone
            </label>
            <p className="text-slate-500 mb-1.5">
              All deadlines will display live dual-time countdowns translated into your local time.
            </p>
            <select
              value={userTz}
              onChange={(e) => setUserTz(e.target.value)}
              className="block w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-medium"
            >
              <optgroup label="Primary / User Time Zone">
                <option value="Asia/Dhaka">Asia/Dhaka (Bangladesh Standard Time, UTC+6)</option>
              </optgroup>
              <optgroup label="US Time Zones">
                {PINNED_US_TIMEZONES.map((tz) => (
                  <option key={tz.zone} value={tz.zone}>
                    {tz.label} ({tz.zone})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Global Zones">
                <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
              </optgroup>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Deadlines & Defaults */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <SettingsIcon className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Application Defaults & Lead Times
          </h3>
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Default Deadline Time (School Time)
            </label>
            <input
              type="text"
              value={defaultTime}
              onChange={(e) => setDefaultTime(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono dark:border-slate-700 dark:bg-slate-800"
            />
            <span className="text-[11px] text-slate-400">
              Used when an application does not specify an exact cut-off hour.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Reminder Lead Days (comma-separated)
            </label>
            <input
              type="text"
              value={reminderLeadDays}
              onChange={(e) => setReminderLeadDays(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono dark:border-slate-700 dark:bg-slate-800"
            />
            <span className="text-[11px] text-slate-400">
              In-app reminders fire at these threshold days before every deadline.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Default Currency
            </label>
            <input
              type="text"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Save Preferences
          </button>
        </form>
      </section>

      {/* 3. Data Management & Backups */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Database className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Data, Backups & Datasets
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* User Data Load */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Load Active User Data</h4>
            <p className="text-slate-500">
              Loads your active faculty contacts (NC State, USF, Dr. Md Abdul Quddus, Dr. Sarper
              Aydın) and interaction logs.
            </p>
            <button
              type="button"
              onClick={async () => {
                await loadUser();
                showToast({ message: 'Loaded your faculty and application records.' });
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Load My Data
            </button>
          </div>

          {/* Fictional Demo Data */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Fictional Demo Data</h4>
            <p className="text-slate-500">
              Populates realistic dummy data ("Example State University") for demonstrations and UI
              testing.
            </p>
            <button
              type="button"
              onClick={async () => {
                await loadDemo();
                showToast({ message: 'Loaded fictional demo dataset.' });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Load Demo Data
            </button>
          </div>

          {/* Export JSON */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Full JSON Backup</h4>
            <p className="text-slate-500">
              Export an offline JSON snapshot containing all universities, applications, checklists,
              and contacts.
            </p>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON Backup
            </button>
          </div>

          {/* Export CSV */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Applications CSV</h4>
            <p className="text-slate-500">
              Export applications list as a spreadsheet-compatible CSV file with deadlines and
              statuses.
            </p>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Clear database button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
          <div>
            <span className="font-bold text-rose-600">Danger Zone</span>
            <p className="text-slate-500">Clear all records from the local SQLite database.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (
                window.confirm('Are you sure you want to clear all data? This cannot be undone.')
              ) {
                await clearDemo();
                showToast({ message: 'Database reset to empty.' });
              }
            }}
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
          >
            Clear Database
          </button>
        </div>
      </section>

      {/* 4. Trash & Recovery */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Trash & Soft Delete Recovery
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {deletedApps.length + deletedUnis.length + deletedContacts.length} items in trash
          </span>
        </div>

        {deletedApps.length === 0 && deletedContacts.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Trash is empty. No deleted records.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {deletedApps.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {a.program}
                  </span>
                  <span className="text-slate-400 ml-2">({a.term})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreApp(a.id)}
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 font-semibold text-white hover:bg-blue-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
              </div>
            ))}

            {deletedContacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                  <span className="text-slate-400 ml-2">({c.kind})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreContact(c.id)}
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 font-semibold text-white hover:bg-blue-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
