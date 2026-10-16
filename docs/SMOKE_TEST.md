# Manual Smoke Test & Verification Guide

This guide describes end-to-end testing procedures for **Track Your PhD Application**.

## Prerequisites

- Node.js >= 22
- Rust toolchain (stable)
- All automated checks pass: `npm run verify`

## 1. Launching the Application

### Desktop Environment (Tauri 2)

```bash
npm run tauri dev
```

### Browser Preview (Development)

```bash
npm run dev
```

## 2. Verification Checklist

### A. Initial Load & Data Seeding

1. Open the application.
2. Confirm the loading state displays gracefully and completes.
3. Verify that the primary sidebar displays all 8 core views:
   - Dashboard
   - Applications
   - Recommenders
   - Faculty
   - Calendar
   - Documents & scores
   - Offers
   - Settings

### B. Faculty Outreach (User Data)

1. Navigate to the **Faculty** view.
2. Verify that faculty outreach entries appear with accurate details:
   - **Dr. Md Abdul Quddus, PhD** (NC State University, Textile Engineering, Chemistry and Science)
     - Outreach status: `emailed`
     - Last email: Fri 16 Oct, 18:38
     - Next follow-up: Tue 27 Oct, 20:37
   - **Dr. Sarper Aydın** (University of South Florida, IMSE)
     - Outreach status: `emailed`
     - Research: multiagent systems, game-theoretical learning, autonomous teams
     - Last email: Wed 14 Oct, 19:45
     - Next follow-up: Mon 26 Oct, 18:00
3. Click "Log email" or "Log meeting" to add a new interaction and confirm the timeline updates immediately.

### C. Dashboard & "Today" Action Items

1. Navigate to the **Dashboard** view.
2. Verify the 4 metric cards: Active Applications, Critical Deadlines (<7d), Letters Outstanding, and Faculty Follow-ups.
3. Verify the "Today" actionable items list displays follow-ups and required checklist tasks.
4. Test clicking "Done" or "Snooze" on an action item and confirm the toast notification appears.

### D. Applications View (Table & Kanban Board)

1. Navigate to **Applications**.
2. Switch between **Table View** and **Kanban Board**.
3. Confirm live countdown tickers display dual-time deadlines (School Time vs Applicant Local Time).
4. Drag or change the status dropdown to update an application (e.g. from `Applying` to `Submitted`).
5. Click an application row to open the **Application Detail Modal**:
   - Check off a required checklist item and verify the readiness percentage updates.
   - Inspect the Fee Waiver warning (alerts when fee waiver is pending <14 days before deadline).
   - Review the Recommenders tab and status change history.

### E. Global Shortcuts

1. Press `Ctrl+K` (or `Cmd+K`) to open the **Command Palette**.
   - Type a query to search programs, faculty, and navigation targets.
   - Press `Enter` to navigate or open a detail view.
2. Press `Ctrl+N` (or `Cmd+N`) to trigger the **Quick Add Modal**.
   - Test university autocomplete and pinned US time zone selection.
3. Press `?` to open the **Keyboard Shortcuts** help modal.

### F. Recommenders Matrix

1. Navigate to **Recommenders**.
2. Verify the matrix grid of recommenders against applications.
3. Click a status cell to cycle through status progression (`not_requested` -> `asked` -> `link_sent` -> `submitted`).
4. Click "Compose Reminder" to generate an academic chase email template pre-filled with the professor's name and school deadline.

### G. Calendar & RFC 5545 .ics Export

1. Navigate to **Calendar**.
2. Toggle between **Month View** and **Agenda View**.
3. Click "Export .ics Calendar" to download the calendar file.
4. Verify that the downloaded `.ics` file imports cleanly into Google Calendar or Apple Calendar.

### H. Documents & Test Scores

1. Navigate to **Documents & scores**.
2. Add a document version (e.g. Statement of Purpose `v1.2`).
3. Record a test score (e.g. GRE 328, TOEFL 112) with expiration date.
4. Verify that score validity badges warn if a score expires before an application deadline.

### I. Offers & April 15 Resolution

1. Navigate to **Offers**.
2. Verify the Council of Graduate Schools (CGS) April 15 Resolution banner.
3. Compare side-by-side stipend, tuition waiver, health insurance, and fees across admitted schools.

### J. Settings & Data Backups

1. Navigate to **Settings**.
2. Change the Applicant Time Zone and confirm countdown tickers update immediately.
3. Click **Export JSON Backup** and verify the offline JSON snapshot downloads.
4. Click **Export CSV** and open the spreadsheet in Excel/Numbers to confirm all columns and values.
