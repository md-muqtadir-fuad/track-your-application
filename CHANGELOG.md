# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Display complete interaction log history on faculty cards with timestamps, channel badges, and full summaries.
- Dedicated "Not Mailed Yet" filter tab, dynamic count badges, inline status switcher, and initial inquiry actions in Faculty view.
- Web application transition with in-browser SQLite WebAssembly (`sql.js`) and IndexedDB snapshot persistence.
- Firebase Authentication with Google Sign-In and Cloud Firestore synchronization.
- Production Cloud Firestore security rules (`firestore.rules`) with isolated user dossier authorization.
- Academic 4-color editorial design system (`#000000`, `#8E1616`, `#E8C999`, `#F8EEDF`) across all 8 views and modals.
- Enhanced logout feedback with toast notifications and detailed cloud sync diagnostic status.
- Design system tokens and academic styling guidelines in `docs/design.md`.
- Full interactive UI views for all 8 screens: Dashboard with Today action items, Applications (table and Kanban board), Recommenders matrix with chase email template generator, Faculty outreach tracker, Calendar with Month and Agenda modes, Documents & scores, Offers side-by-side comparison, and Settings.
- Global Command Palette (`Cmd/Ctrl+K`), Quick Add Modal (`Cmd/Ctrl+N`), and Keyboard Help Modal (`?`).
- Application readiness calculation (0–100%) and at-risk assessment service.
- RFC 5545 standard `.ics` calendar export and JSON/CSV data backup engine.
- Local user outreach loader (`user-loader.ts`) supporting private local datasets.
- SQLite database schema with full migration runner via `tauri-plugin-sql` and test runner via `sql.js`.
- Type-safe database repositories for universities, applications, milestones, contacts, letter requests, faculty links, interactions, and settings.
- IANA-compliant wall-clock date/time utility module with dual-time countdowns and Arizona DST-free handling.
- Deterministic pure reminder calculation engine with configurable threshold lead times and snoozing.
- Fictional demonstration dataset generator and database reset utility.

## [0.1.0] - 2026-10-16

### Added

- Initial desktop application scaffold using Tauri 2, React 19, TypeScript, and Vite.
- Responsive and accessible sidebar shell with eight primary views: Dashboard, Applications, Recommenders, Faculty, Calendar, Documents & scores, Offers, and Settings.
- Unified verification script `npm run verify` combining Prettier, ESLint, TypeScript compiler, Vitest, React Testing Library, rustfmt, Cargo clippy, and Cargo test.
- ADR-0001 documenting the desktop technology stack decision and trade-offs.
- Project specification and data model guidelines in `docs/SPEC.md`.
- Automated GitHub Actions CI workflow for cross-platform checking and test execution.
- Automated GitHub Actions Release workflow using Tauri Action for multi-platform bundle builds.
