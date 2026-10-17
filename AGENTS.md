# AGENTS.md

Web app (React + TypeScript + Vite + Firebase) for tracking PhD applications.
Product brief: `docs/SPEC.md`. Design tokens: `docs/design.md`.

## Commands

- Install: `npm ci`
- Run: `npm run dev`
- Check everything (run before every commit): `npm run verify`
- Build production bundle: `npm run build`

## Rules

- Web/React best practices only.
- Dates: store deadlines as local wall-clock time + IANA zone. All date logic lives in `src/lib/time/` and must have tests.
- Database: Firebase Firestore for real-time cloud sync with client offline caching.
- Public repo: never commit real application data, backups, real contact names or emails, secrets or build output. Demo data is fictional.

## Git

- Default branch `master`: no direct commits, no force-push.
- Branch `<type>/<scope>` from an up-to-date `master`.
- Conventional Commits, one logical change per commit, `npm run verify` passes before committing.
- Stage deliberately and read `git diff --staged` before each commit.
- PR with template, green CI, rebase-merge, delete branch.
- User-facing change: add a line under `[Unreleased]` in `CHANGELOG.md`.
- Release: bump the version in `package.json`; annotated tag `vX.Y.Z` on `master`.
