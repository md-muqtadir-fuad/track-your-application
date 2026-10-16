# 1. Desktop Application Architecture and Technology Stack

Date: 2026-10-16

## Status

Accepted

## Context

We are building a private, local-first desktop application to track PhD applications. The tool must:

- Run entirely offline with zero network telemetry or cloud dependence.
- Provide a fast, accessible, keyboard-friendly UI with high design standards and accessibility (WCAG AA).
- Produce small, lightweight desktop installers without heavy runtime bloat.
- Enforce strict security and local data boundaries.

The primary user is an international applicant tracking deadlines across time zones, letters of recommendation, faculty contacts, and application checklists.

## Options Considered

1. **Tauri 2 (React + TypeScript + Vite)**:
   - Uses the OS-native webview (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux).
   - Very small binary sizes (~15MB vs ~120MB+ for Electron).
   - Rust core provides excellent memory safety and a granular, capability-based permission model.
   - Rich web ecosystem for accessible UI components (Tailwind CSS, Radix UI, TanStack Table, dnd-kit).

2. **Electron (React + Node.js)**:
   - Bundles Chromium and Node.js.
   - Highly consistent rendering across OS platforms.
   - Significant memory overhead and large installer/binary footprint (~120MB–200MB).
   - Broader attack surface and less granular capability confinement.

3. **Python (PySide6 / PyQt)**:
   - Python ecosystem is familiar.
   - Packaging with PyInstaller or Briefcase can be fragile and bulky.
   - Achieving modern, accessible, highly responsive UI with fluid transitions is substantially slower and harder to maintain compared to modern web/React primitives.

## Decision

We choose **Tauri 2** with **React**, **TypeScript (strict)**, and **Vite**.

Detailed architectural components:

- **UI & Components**: Tailwind CSS, Radix UI primitives (shadcn/ui style), Lucide React icons, TanStack Table for dense data tables, dnd-kit for Kanban board views.
- **Typography & Assets**: Fonts bundled locally via `@fontsource` packages. Zero runtime CDN requests.
- **Time Calculation**: Luxon. All date/time conversions, time zone calculations (IANA), and DST handling are encapsulated and unit-tested in `src/lib/time/`.
- **Database & Storage**: Local SQLite managed via `tauri-plugin-sql` (with `sqlite` feature). Database migrations are maintained as `.sql` files in `migrations/` and registered in Rust via `include_str!`. Least-privilege permissions configured in `src-tauri/capabilities/`.
- **Data Access Pattern**: A thin typed repository layer in `src/lib/db/` over an `Executor` interface (`select`, `execute`) validated using Zod schemas. The production executor uses Tauri's SQL plugin; the test executor runs in Node against in-memory SQLite executing the exact same migration files.
- **Tauri Plugins**: Only official plugins as required: `opener`, `sql`, `notification`, `dialog`, `fs`.
- **Quality & Verification**: Unified `npm run verify` checking Prettier, ESLint, TypeScript types, Vitest unit/component tests, `cargo fmt`, `cargo clippy -D warnings`, and `cargo test`.

## Consequences and Trade-offs

- **Small footprint**: Fast launch times, minimal resource usage, and compact installers.
- **Strong security**: Local-first capability boundaries prevent unintentional network access.
- **Rendering differences**: Because Tauri uses system webviews (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux), rendering and font metrics may have slight OS-level variance. To mitigate this, cross-platform testing on Windows and at least one other OS (macOS/Linux) is required during smoke testing and releases.
