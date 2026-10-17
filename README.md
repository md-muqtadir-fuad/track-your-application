# Track Your PhD Application

A distinguished, local-first web application designed for prospective doctoral and graduate applicants to track admissions dossiers, time-zone-aware deadlines, letters of recommendation, faculty outreach, and funding offers.

**Live Application:** [https://my-phd-6368d.web.app](https://my-phd-6368d.web.app)

---

## Academic Editorial Aesthetic

Built with an academic design system adhering strictly to a 4-color scholarly palette:

- **Jet Black (`#000000`)**: Primary typography, mathematical rules, and high-contrast borders.
- **Deep Academic Oxblood (`#8E1616`)**: Candidate seal Ψ, primary buttons, program headings, and urgent deadline alerts.
- **Warm Sandstone (`#E8C999`)**: Scholarly table headers, secondary badges, and parchment paper highlights.
- **Warm Ivory Linen (`#F8EEDF`)**: Base folio background, modal surfaces, and clean text inputs.

Zero generic "AI SaaS" gradients or navy blue slabs — styled like a publication-ready academic dissertation folio.

---

## Core Capabilities

1. **Dual-Zone Wall-Clock Deadlines**: Accurately tracks institutional deadlines in their native IANA time zone (e.g. `America/New_York`, `America/Phoenix`) alongside your local wall-clock time, with real-time countdown badges and DST handling.
2. **Applications Dossier**: View your applications in an academic booktabs table or a stage-based Kanban board with readiness scoring (0–100%) and at-risk alerts.
3. **Recommenders Matrix**: Institutional status matrix for tracking reference requests across programs with automated polite follow-up email generators.
4. **Faculty Outreach Log**: Manage prospective advisors, interaction history (sent/received), notes, and scheduled follow-up dates.
5. **Scholarly Calendar**: Month and Agenda views with RFC 5545 standard `.ics` calendar exports with embedded reminder alarms (`VALARM`).
6. **Documents & Test Scores**: Track statement drafts, CV revisions, portfolio links, and standardized test validity (GRE/TOEFL/IELTS) against application deadlines.
7. **Offers & CGS Resolution**: Side-by-side financial package comparisons (stipend, tuition waiver, health insurance) respecting the Council of Graduate Schools (CGS) April 15 Resolution.
8. **Command Palette & Hotkeys**:
   - `Ctrl/Cmd + K`: Jump to dossier search & navigation
   - `Ctrl/Cmd + N`: Quick-add a new program application
   - `?`: Keyboard shortcuts helper

---

## Architecture & Storage

- **Local SQLite Engine**: Fast in-browser SQLite WebAssembly (`sql.js`) with complete SQL schema migrations (`0001_init.sql`), foreign keys, and indexes.
- **IndexedDB Snapshot Caching**: Automatically saves snapshots to IndexedDB (`phd_tracker_db_store`) on every edit for instant 0ms loads and complete offline reliability.
- **Optional Firebase Cloud Sync**: Sign in with Google to synchronize your local SQLite database binary and mirror collections to private Cloud Firestore storage (`/users/{userId}/**`).
- **Production Security Rules**: Hardened in `firestore.rules` with strict authenticated user isolation.
- **Full Offline Export**: Export offline JSON backups or CSV spreadsheets anytime from Settings.

---

## Development & Deployment

### Prerequisites

- **Node.js**: v22 LTS
- **npm**: v10+

### Key Commands

```bash
# Install dependencies
npm ci

# Start local development server (http://localhost:5173)
npm run dev

# Run comprehensive verification suite (formatting, linting, typecheck, Vitest unit tests)
npm run verify

# Build production bundle
npm run build

# Log in to Firebase CLI
npm run login

# Deploy production hosting and security rules to Firebase
npm run deploy
```

---

## Verification & Quality

Every change is validated against the test suite:

```bash
npm run verify
```

- **Prettier**: Strict code formatting
- **ESLint**: React 19 and TypeScript best practices
- **TypeScript**: `tsc --noEmit` strict typechecking
- **Vitest**: 32 unit tests covering time arithmetic, SQLite repositories, readiness scoring, reminder calculations, and data exports.

---

## License

This project is licensed under the [MIT License](LICENSE).
