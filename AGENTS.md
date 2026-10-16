# AGENTS.md

Local-first desktop app (Tauri 2 + React + TypeScript + SQLite) for tracking PhD applications.
Product brief: `docs/SPEC.md`. Decisions: `docs/adr/`. Design tokens: `docs/design.md`.

## Commands

- Install: `npm ci`
- Run: `npm run tauri dev`
- Check everything (run before every commit): `npm run verify`
- Build installers: `npm run tauri build`

## Rules

- Tauri v2 APIs only (capabilities and permissions). Grant the minimum permissions.
- Dates: store deadlines as local wall-clock time + IANA zone. All date logic lives in `src/lib/time/` and must have tests.
- Database: SQL only in `src/lib/db/`, migrations in `migrations/`. Never edit a migration that has shipped; add a new one.
- No network calls, telemetry or CDN assets at runtime.
- Public repo: never commit real application data, databases, exports, backups, real contact names or emails, secrets or build output. Demo data is fictional.

## Git

- Default branch `master`: no direct commits, no force-push.
- Branch `<type>/<scope>` from an up-to-date `master`.
- Conventional Commits, one logical change per commit, `npm run verify` passes before committing.
- Stage deliberately and read `git diff --staged` before each commit.
- PR with template, green CI, rebase-merge, delete branch.
- User-facing change: add a line under `[Unreleased]` in `CHANGELOG.md`.
- Release: bump the version in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`; annotated tag `vX.Y.Z` on `master`.
