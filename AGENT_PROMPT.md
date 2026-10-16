# Build brief: Track Your PhD Application (desktop app)

Repo: https://github.com/md-muqtadir-fuad/track-your-phd-application
Brief date: 2026-10-16

How to use: paste this whole file into your coding agent, or save it as `docs/SPEC.md` in a clone of the repo and say: "Read docs/SPEC.md and start Phase 0."

---

## 0. Role and working agreement

You are the engineer and maintainer for this project. Build a small, polished, offline desktop app and keep the repository in exemplary shape. Every change follows the git workflow in section 8.

- Read the whole brief before writing code. Where it is silent, pick the simplest option consistent with section 2 and record significant choices as ADRs in `docs/adr/`.
- Checkpoint mode (default): finish a phase, send the report in section 12, then stop and wait for my "go". If I say "go autonomous", continue phase to phase and still report at each phase end.
- Use current stable versions of every tool. Verify APIs against official docs, not memory. Tauri v1 and v2 differ a lot (v2 uses capabilities and permissions). Use v2 only.
- If blocked (missing toolchain, no push access, platform failure), stop and tell me the exact command or action needed. Never weaken a check to get past a problem.
- Ask me before: renaming the default branch, changing GitHub repo settings, adding any network feature or paid service, or deviating from the stack in section 4.

## 1. Product

A private, local desktop app that answers three questions every day of application season:

1. What is due next, and exactly when in my time zone?
2. What am I waiting on: letters, score reports, fee waivers, faculty replies, decisions?
3. Where does each application stand?

Primary user: me. I am an international applicant (my time zone: Asia/Dhaka) applying to US PhD programs and possibly some MS programs. I email potential advisors before applying, and I ask the same few recommenders for letters to many programs. The app must be usable without reading documentation.

## 2. Principles (non-negotiable)

1. Local-first and private. No account, cloud, telemetry or runtime network calls. All data lives in one SQLite file in the OS app-data directory, never in the repo.
2. Simple by default, detail on demand. A new application needs three things: university, program, deadline. Everything else is optional and revealed progressively.
3. Never lose data. Autosave, transactional writes, automatic backups, soft delete with undo.
4. Deadlines are exact. Every deadline is a wall-clock time plus the institution's IANA time zone, shown in both school time and my time.
5. Recognition over recall. The app surfaces what is next, missing and pending so I don't have to remember it.
6. Fast and keyboard-friendly, with shortcuts that stay out of a beginner's way.
7. Accessible. WCAG AA contrast, visible focus, status shown by text and icon as well as colour, respects reduced motion and OS light/dark.
8. No passwords stored. Portal URL and username only.

## 3. Domain facts the design must respect

These come from university and testing-agency pages (links in Appendix B). Build around them.

- Deadlines have a time and a zone, and it is not always midnight. UC Berkeley graduate applications are due 8:59 PM Pacific on the deadline date.
  → Store `due_local` + `tz`, never a bare date. If I enter only a date, default to 23:59 school time and flag it "Time assumed. Check the program page."
- Some programs treat an application as complete only when letters and official test scores have been received and verified by the deadline (Berkeley IEOR).
  → Letters and score reports need their own due dates before the deadline.
- Letters: three is typical. Each program's portal emails each recommender a personal link, so one recommender submits separately to every program. Chasing them is the applicant's job (Purdue says so explicitly). Some portals don't allow changing recommenders after entry (Michigan Robotics). Applicants choose whether to waive their right to view letters.
  → The recommender × application matrix is a core screen. Letter requests are due on the application's `letters` date if set, otherwise its application deadline.
- GRE: four free score reports on test day. Later reports cost a per-recipient fee and take about five business days to process. Scores are valid five years (ETS).
  → "Send official scores" checklist items default to 10 days before the deadline. Test scores carry a validity date and warn if they expire before a deadline.
- Fee waivers: often must be requested about two weeks before the deadline and cannot be applied after submission. Many graduate schools exclude international applicants from central waivers, while some departments still consider them (Oregon State, UCSF, BU, UCSD BioSci).
  → Track waiver route (central or department), waiver request date (default 14 days before deadline) and status. Warn if I mark an application Submitted while a waiver is still pending.
- Contacting faculty before applying: advice is genuinely mixed (ProFellow recommends it, Admit Lab advises waiting unless the program asks), and some departments ask applicants not to.
  → Per-application "faculty contact policy" field (encouraged, neutral, discouraged, unknown) plus a faculty outreach log.
- Funding offers: under the CGS April 15 Resolution, students need not respond to offers of financial support before April 15. The deadline is 11:59 PM on April 15 in the offering school's time zone. It covers financial support only, not admission-only offers.
  → When I record a funded offer, prefill the response deadline as April 15, 23:59 school time (editable). Compare offers side by side.
- Fees can differ by residency (Berkeley lists a higher fee for non-US applicants).
  → Fee amount and currency per application.

## 4. Tech stack (decided; record as `docs/adr/0001-desktop-stack.md`)

- Shell: Tauri 2. Frontend: React + TypeScript (strict) + Vite.
- UI: Tailwind CSS + shadcn/ui (Radix primitives, accessible). TanStack Table for tables, dnd-kit for the board, lucide-react icons. Fonts bundled locally (for example via @fontsource). No CDNs.
- Time: Luxon. All date logic in `src/lib/time/`.
- Storage: SQLite via the official Tauri SQL plugin (`tauri-plugin-sql` with the `sqlite` feature). Migrations are `.sql` files in `migrations/`, registered in Rust via `include_str!`. Grant only the permissions needed in `src-tauri/capabilities/` (for example `sql:default`, `sql:allow-execute`).
- Data access: a thin typed repository layer in `src/lib/db/` over an `Executor` interface (`select`, `execute`) with zod validation. Production executor = plugin-sql. Test executor = in-memory SQLite in Node (better-sqlite3 or sql.js) running the same migration files. Normalise placeholder style inside the executor.
- Other official Tauri plugins, only as needed: notification (reminders), dialog (file pickers), opener (files, URLs, mailto), fs (export and backup).
- Tooling: npm with committed lockfile. Node LTS pinned in `.nvmrc` and `engines`. Rust stable pinned via `rust-toolchain.toml`. ESLint, Prettier, Vitest, React Testing Library, rustfmt, clippy. husky + lint-staged + commitlint (`@commitlint/config-conventional`).
- ADR content: options considered are Tauri, Electron and Python/PySide6. Tauri is chosen for small installers (it uses the system webview instead of bundling a browser engine), a fast path to a polished accessible UI, and its permission-based security model. Trade-off: rendering differs slightly by OS webview (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux), so test on Windows plus at least one other OS.

## 5. Data model (v1)

Every table has `id` (TEXT UUID), `created_at`, `updated_at` (UTC ISO 8601). User-deletable entities also have `deleted_at` (soft delete).

- `university`: name, country, city, tz (IANA), website.
- `application`: university_id, program, department, degree (phd | ms | other), term (e.g. "Fall 2027"), status, priority (1–3), fit (1–5), tags (JSON array), program_url, portal_url, portal_username, faculty_contact_policy, fee_amount, fee_currency, fee_paid_on, waiver_route (none | central | department), waiver_status (not_applicable | eligible | requested | granted | denied), submitted_at, notes (markdown).
- `milestone` (any dated item for an application): application_id, kind (application | priority | fee_waiver | letters | scores | interview | response | other), label, due_local (`YYYY-MM-DDTHH:mm`), tz, time_assumed (bool), done_at, notes. At most one `application` milestone per application.
- `checklist_item`: application_id, kind (sop | personal_statement | cv | writing_sample | transcript | test_scores | english_test | fee | portal_form | other), label, status (todo | in_progress | done | not_required), due_offset_days (relative to the application deadline) or due_local + tz (absolute), document_id, test_score_id, notes, sort_order.
- `contact`: kind (recommender | faculty | staff | other), name, email, title, affiliation, university_id, website, notes. Faculty only: outreach_status (not_contacted | emailed | replied_positive | replied_neutral | replied_no | meeting_set | met), next_follow_up_on, intro_via (free text, e.g. "introduced by my supervisor").
- `letter_request`: application_id, contact_id, status (not_requested | asked | link_sent | submitted | confirmed_received | declined), asked_on, link_sent_on, submitted_on, last_reminded_on, waived_right_to_view (bool), notes. Unique (application_id, contact_id).
- `faculty_link`: application_id, contact_id, role (potential_advisor | named_in_application), notes.
- `interaction`: contact_id, application_id (nullable), occurred_on, channel (email | meeting | call | other), direction (sent | received), summary, follow_up_on.
- `document`: kind, title, version_label, file_path (a reference to a file I keep elsewhere; never copy files into the repo), notes.
- `test_score`: test (gre | toefl | ielts | duolingo | other), taken_on, total, sections (JSON), valid_until, notes.
- `offer`: application_id (unique), funding_type (fellowship | ta | ra | mixed | none), stipend_amount, stipend_period (year | semester | month), currency, tuition (full | partial | none), health_insurance (full | partial | none), years_guaranteed, fees_not_covered, other_terms, letter_path, response_due_local, response_tz, decision (pending | accepted | declined).
- `status_change`: application_id, from_status, to_status, changed_at.
- `template`: kind (checklist | email), name, body (JSON for checklists, text with `{{placeholders}}` for email).
- `reminder_log`: item_key, lead_days, shown_at, snoozed_until.
- `setting`: key, value.

Application statuses: Exploring, Applying, Submitted, Interviewing, Admitted, Waitlisted, Rejected, Accepted, Declined, Withdrawn. Log every change in `status_change`.

Computed, never stored: readiness (completed required checklist items + submitted letters, over the total required), next action (earliest open dated item), countdown in my time zone, at-risk (deadline within 14 days and readiness under 80%, or a letter not submitted within 7 days of its due date).

## 6. Screens and behaviour

Sidebar, eight items at most: Dashboard, Applications, Recommenders, Faculty, Calendar, Documents & scores, Offers, Settings.

1. Dashboard. "Today": the next ~10 actions across everything (deadlines, checklist items, letters to chase, follow-ups), each with Done and Snooze. Upcoming deadlines (next 60 days) with countdown, school time and my time. At-risk list. Status counts. Letters per recommender ("3 of 8 submitted"). Fees: planned, paid, waived.
2. Applications. Table view (sort, filter, search, column chooser, inline edit of status and priority) and Board view (one column per active status, drag to change status, closed statuses collapsed). Quick add (Ctrl/Cmd+N): university (autocomplete; a new university asks for its time zone with US zones pinned: Eastern, Central, Mountain, Arizona (no DST), Pacific, then a searchable IANA list), program, deadline date and optional time. Creating an application applies the default checklist template and adds a `not_requested` letter request for each default recommender from Settings.
3. Application detail. Header: university, program, status menu, countdown (both time zones), readiness bar, program and portal links. Sections: Checklist, Letters, Faculty (with contact policy), Key dates, Fees & waiver, Documents, Timeline & notes (status history, interactions, markdown notes), Decision & offer.
4. Recommenders. Matrix: rows are recommenders, columns are active applications sorted by deadline (deadline in the column header). Each cell is a status chip; click to change. Row action "Copy reminder" builds a polite email listing only that person's pending programs with deadlines in the school's time zone; "Open in mail app" uses mailto. Record `last_reminded_on`.
5. Faculty. Contacts with university, outreach status, last contact, next follow-up, linked applications. "Log email" adds an interaction and sets a follow-up (default +10 days). Filter "Follow-ups due".
6. Calendar. Month and agenda views of every dated item; .ics export (section 7).
7. Documents & scores. Document versions with "Open file" and "Show in folder" (warn if the file moved) and where each one is used. Test scores with validity warnings.
8. Offers. Comparison of admitted applications: funding type, stipend normalised per year, tuition, insurance, years guaranteed, fees, response deadline with countdown, notes. Label stipends as nominal unless I add a cost-of-living note.
9. Settings. My time zone (default from OS), reminder lead times (default 30, 14, 7, 3, 1 days), default deadline time, default recommenders, checklist and email template editors, default currency, theme, density, font size, data (open folder, back up now, restore, export, import), demo data (load or remove).

Cross-cutting: command palette (Ctrl/Cmd+K) for search and actions; shortcut help on `?`; autosave with a quiet "Saved" indicator; undo toast for deletes and status changes; Trash in Settings; empty states that invite the next action; plain-language errors that say what happened and how to fix it. First-run onboarding: confirm time zone, add recommenders (optional), then add a first application, import a CSV, or load demo data.

Design direction (do this before building UI): write `docs/design.md` with 4–6 named colours (hex) for light and dark, one or two bundled typefaces with a type scale, a spacing scale, and a status map (colour + icon + label per status). Then review it against this brief and revise anything that would look the same on any SaaS dashboard. Mood: a calm, precise workspace for an academic during a stressful season. Dense where data needs it (table, matrix), quiet elsewhere. Spend boldness in one place, such as the deadline countdown. Avoid template tells: cream background with terracotta accent, near-black with a neon accent, identical rounded cards with the same soft shadow, gradient washes, all-caps eyebrow labels, arrows appended to button text. Copy is sentence case with plain verbs, and an action keeps one name throughout ("Mark as submitted" produces the toast "Marked as submitted"). Motion only in response to user actions.

## 7. Reminders, calendar, import/export, backups

- Reminder engine: a pure, tested function (now, items, lead times, reminder log) → due reminders. Runs at launch and every 15 minutes while the app is open. Shows an in-app panel plus an OS notification, never repeats a shown reminder, snooze 1 or 3 days.
- Calendar export (.ics, RFC 5545): one VEVENT per dated item, DTSTART in UTC (`...Z`) to avoid VTIMEZONE complexity, the school-local time and application name in DESCRIPTION, VALARMs for my lead times, a stable UID per item. The app can only notify while running, so .ics export is how reminders reach my phone. The README must note that calendar apps differ in how they treat imported alarms.
- Export: full JSON (with a schema version, re-importable) and an applications CSV, via a save dialog.
- Import: JSON restore (confirm first, automatic backup first) and a CSV import wizard for applications (column mapping, preview, validation report, then import).
- Backups: before every migration and on the first launch each day, write a consistent copy (for example `VACUUM INTO`) to `<app-data>/backups/` and keep the newest 14. An optional extra backup folder (for example a cloud-synced folder) receives copies only. Never move the live database into a synced folder. Restore from Settings.

## 8. Git and GitHub workflow (strict)

Current repo state: public, default branch `master`, one commit containing only `LICENSE` (MIT). Keep `master` as the default branch. Build in the repo root and keep the LICENSE.

Because the repo is public, never commit the database, exports, backups, real recommender or professor names or emails, screenshots with real data, secrets, `.env` files, signing keys, or build output. Demo data must be obviously fictional ("Example State University", "Dr. Ada Placeholder").

Branches: short-lived, created from an up-to-date `master`, named `<type>/<scope>`, for example `feat/letters-matrix`, `fix/dst-conversion`, `chore/bootstrap`, `docs/readme`, `ci/release-workflow`. At least one PR per phase; split large phases into several PRs.

The commit loop, every time:

1. `git switch master && git pull --ff-only`, then `git switch -c <type>/<scope>`.
2. Make one logical, working change. Never mix formatting or refactors with features.
3. Run `npm run verify` (format check, lint, typecheck, unit tests, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`). Fix failures first.
4. Review `git status` and `git diff`. Stage deliberately (`git add <paths>` or `git add -p`). Read `git diff --staged`.
5. Commit with Conventional Commits: `type(scope): imperative summary` (72 characters max), a body explaining why when it isn't obvious, and footers `BREAKING CHANGE:` or `Refs: #n` when relevant. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Examples:
   - `feat(applications): add quick-add dialog with school time zone`
   - `fix(time): keep Arizona deadlines at UTC-7 year-round`
   - `test(reminders): cover snooze and no-repeat rules`
   - `docs(readme): explain data folder and backups`
   - `chore(release): v0.3.0`
6. Push the branch at each meaningful checkpoint: `git push -u origin <branch>`.

Hooks: pre-commit runs lint-staged, commit-msg runs commitlint, pre-push runs `npm run verify`. Never bypass hooks with `--no-verify`.

Pull requests: `gh pr create` (if gh is installed and authenticated) using `.github/pull_request_template.md` (what and why, screenshots with demo data, how tested, checklist). Merge only with green CI, using rebase-merge to keep a linear history of atomic commits: `gh pr merge --rebase --delete-branch`. Without gh: rebase on `master`, fast-forward `master`, push, delete the branch, and tell me.

Never commit directly to `master`, force-push `master`, rewrite published history on `master`, merge with failing checks, or commit with failing tests. Force-pushing your own feature branch after a rebase is fine with `--force-with-lease`.

Versioning and releases: SemVer from 0.1.0, one minor version per phase until 1.0.0. Keep the version identical in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`. `CHANGELOG.md` follows Keep a Changelog: every user-facing change adds a line under `[Unreleased]` in the same PR. A release is a `chore(release): vX.Y.Z` PR that bumps versions and moves `[Unreleased]` into a dated version section. After merging, create an annotated tag on `master` (`git tag -a vX.Y.Z -m "vX.Y.Z"`) and push it.

CI (`.github/workflows/ci.yml`): on push and PR, ubuntu runner, Tauri v2 Linux dependencies (WebKitGTK 4.1 and the rest per Tauri docs), npm and Rust caches, `npm ci`, `npm run verify`.
Release (`.github/workflows/release.yml`): on tags `v*`, use tauri-action (the version shown in the current Tauri docs) to build Windows, macOS (Apple Silicon and Intel) and Linux bundles and attach them to a draft GitHub Release for that tag. I publish the draft.

Repo hygiene (Phase 0): `.gitignore` (node_modules, dist, src-tauri/target, bundles, `*.db*`, `*.sqlite*`, backups, exports, `.env*`, OS and editor files), `.gitattributes` (`* text=auto eol=lf`, CRLF for `*.bat` and `*.cmd`, binary for images and fonts), `.editorconfig`, PR template, bug and feature issue templates, a short `CONTRIBUTING.md` pointing to `AGENTS.md`.

Suggest (don't apply) branch protection for `master`: require a PR and green CI, block force pushes.

## 9. Phases

Application deadlines start around December 1, so phases 0–3 come first and stay lean. I want to start using the app as early as possible.

Phase 0: Bootstrap → v0.1.0
Inspect the repo (`git status`, `git log --oneline`, `git branch -a`, `git remote -v`). On `chore/bootstrap`: scaffold Tauri 2 + React + TS + Vite in the repo root; tooling and `npm run verify`; hooks; hygiene files; `AGENTS.md` from Appendix A verbatim (if your tool reads a different file such as CLAUDE.md, add that file containing only a pointer to AGENTS.md); this brief as `docs/SPEC.md`; ADR-0001; README skeleton (what and why, privacy statement, dev setup, where data lives); `CHANGELOG.md`; CI. Done when `npm run tauri dev` opens a window with the sidebar shell, CI is green, the PR is merged and v0.1.0 is tagged.

Phase 1: Data layer → v0.2.0
Migrations, executor abstraction, repositories, settings, time utilities, reminder-engine core, backups, fictional demo data. Done when repository and time tests pass (including the cases in section 10) and the database and a backup appear in the app-data directory.

Phase 2: Applications core, first usable version → v0.3.0
Quick add, table, board, detail page (checklist, key dates, fees & waiver, notes, timeline), status history, search, soft delete with undo, `docs/design.md` applied.

Phase 3: Letters and faculty → v0.4.0
Contacts, recommender matrix, reminder email templates, faculty outreach log, follow-ups, contact policy.

Phase 4: Dashboard, calendar, reminders → v0.5.0
Today list, at-risk logic, notifications, calendar views, .ics export.

Phase 5: Documents, scores, offers → v0.6.0
Document library, score validity warnings, offer comparison with April 15 prefill.

Phase 6: Import/export, onboarding, polish, release → v1.0.0
JSON and CSV export, JSON restore, CSV import wizard, onboarding, command palette and shortcuts, accessibility pass, release workflow, README with screenshots (demo data only), `docs/SMOKE_TEST.md` run on Windows and one other OS, tag v1.0.0.

## 10. Testing

- Unit (Vitest): time conversion and countdowns; reminder engine; readiness and at-risk; CSV mapping and validation; .ics output (golden files); JSON export → import round trip; repositories against in-memory SQLite using the real migrations; an upgrade test that migrates a previous-version fixture database without data loss.
- Component (React Testing Library): quick add, status change with undo, matrix cell edit, CSV import preview.
- Rust: `cargo test` for any custom commands; clippy clean.
- Manual smoke test per release (`docs/SMOKE_TEST.md`): install, first run, add an application, change my time zone, a reminder fires, export and import, backup and restore, upgrade keeps data.
- Required time-zone cases (my zone Asia/Dhaka, UTC+6, no DST):
  - 2026-12-15 20:59 America/Los_Angeles → 2026-12-16 04:59 UTC → 2026-12-16 10:59 Dhaka
  - 2026-12-15 23:59 America/New_York → 2026-12-16 04:59 UTC → 2026-12-16 10:59 Dhaka
  - 2027-04-15 23:59 America/New_York (EDT) → 2027-04-16 03:59 UTC → 2027-04-16 09:59 Dhaka
  - 2026-12-01 23:59 America/Phoenix → 2026-12-02 06:59 UTC, and 2027-04-15 23:59 America/Phoenix → 2027-04-16 06:59 UTC (Arizona has no DST)
  - Local times that don't exist or occur twice at DST transitions resolve by a documented, tested rule.
  - Changing my time zone in Settings changes display only, never stored deadlines.

## 11. Out of scope for v1

Cloud sync, accounts, multi-user, logging into or scraping application portals, storing passwords, fetching deadlines from the web, AI features, mobile, auto-update (possible in v1.1; signing keys would live only in GitHub Secrets), code signing (document the Windows SmartScreen and macOS Gatekeeper prompts for unsigned builds in the README).

## 12. Phase report (every phase)

What changed, how to try it, screenshots (demo data only), tests added, known issues, decisions made (ADR links), `git log --oneline vPREV..vNEW`, and the plan for the next phase.

---

## Appendix A: AGENTS.md (commit verbatim; keep it short)

Keep this file short and limited to rules that cannot be inferred from the code. Update it only when a rule changes. Do not add a codebase overview.

```markdown
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
```

## Appendix B: Sources

- Deadline times: https://grad.berkeley.edu/admissions/steps-to-apply and https://physics.berkeley.edu/academic/graduate-degree/graduate-admissions
- Complete by the deadline, including letters and scores: https://ieor.berkeley.edu/academics/phd/how-to-apply/
- Letters: https://gradadmissions.stanford.edu/apply/recommendations, https://engineering.purdue.edu/IE/academics/graduate/future/recommendation, https://robotics.umich.edu/academics/graduate/admissions/letters-of-recommendation/
- GRE score reports: https://www.ets.org/gre/test-takers/general-test/scores/send-scores.htm
- Fee waivers: https://gradschool.oregonstate.edu/admissions/graduate-application-fee-waivers, https://graduate.ucsf.edu/node/661, https://bu.edu/cas/admissions/phd-mfa/apply/fee-waiver, https://biology.ucsd.edu/education/grad/phd/admissions/faq/fee-waiver.html
- Contacting faculty: https://www.profellow.com/tips/how-to-get-into-a-fully-funded-phd-program-contacting-potential-phd-advisors/, https://admit-lab.medium.com/should-you-contact-professors-before-applying-to-grad-school-the-admit-lab-60b81941744d
- April 15 Resolution: https://gradschool.utah.edu/future-students/april-15-resolution.php, https://my3.my.umbc.edu/groups/gpd/files/10972
- Tauri: https://v2.tauri.app/start/, https://v2.tauri.app/plugin/sql/, https://tauri.app/distribute/pipelines/github/, https://github.com/tauri-apps/tauri-action
- Conventions: https://www.conventionalcommits.org/en/v1.0.0/, https://keepachangelog.com/en/1.1.0/, https://agents.md/
- Context-file research (why AGENTS.md stays short): https://www.infoq.com/news/2026/03/agents-context-file-value-review/
- Usability heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
