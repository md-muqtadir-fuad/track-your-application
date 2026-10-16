# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
