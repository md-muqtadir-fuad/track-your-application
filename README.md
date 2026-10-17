# Track Your PhD Application

A private, local-first web application designed to keep track of graduate program applications, deadlines across time zones, letters of recommendation, faculty outreach, and funding offers.

Built with React 19, TypeScript, Vite, Tailwind CSS, SQLite (via sql.js WASM), and Google Firebase (free Spark tier for Auth & Firestore sync).

---

## What and Why

During graduate application season, applicants juggle dozens of moving parts:

1. **What is due next, and exactly when in my time zone?** Deadlines occur at specific wall-clock times in universities' respective time zones (e.g., 8:59 PM Pacific), not just arbitrary midnight dates.
2. **What am I waiting on?** Tracking recommendation letter submissions across multiple programs, official score reports, fee waivers, faculty emails, and interview calls.
3. **Where does each application stand?** Consolidating requirements, readiness scores, and status updates in one clear, responsive dashboard.

This application is built to answer these three questions every day with zero cognitive overhead, keyboard shortcuts, and clear visual cues.

## Privacy & Storage

- **Local-First Speed**: In-memory SQLite with IndexedDB caching provides instant 0ms responses without network lag.
- **Optional Cloud Sync**: Sign in with Google to synchronize encrypted snapshots and records to your private Google Cloud Firestore.
- **No Password Storage**: The app stores portal links and usernames only, never passwords.
- **Export Anytime**: Full database snapshots can be exported to standard JSON at any time from the Settings view.

## Development Setup

### Prerequisites

- **Node.js**: v22 LTS (managed via `.nvmrc`)
- **npm**: v10+

### Setup and Running

```bash
# Install dependencies
npm ci

# Start the local development server (http://localhost:5173)
npm run dev

# Run all verification checks (formatting, linting, typecheck, tests)
npm run verify

# Build production bundle
npm run build

# Deploy to Firebase Hosting (free tier)
npm run deploy
```

## Important Notes

### Calendar (.ics) Alarms

Exported `.ics` calendar files include RFC 5545 `VALARM` reminder alerts for milestone lead times. Please note that different calendar applications (Google Calendar, Apple Calendar, Microsoft Outlook) differ in how they parse and trigger alarms imported from local `.ics` files.

## License

This project is licensed under the [MIT License](LICENSE).
