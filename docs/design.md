# Design System & Tokens: Track Your PhD Application

This document defines the visual design system for Track Your PhD Application, adhering to the requirements in `docs/SPEC.md` Section 6.

## 1. Principles & Mood

- **Mood**: A calm, precise workspace for an academic during a stressful application season.
- **Data Density**: Dense where high information bandwidth is critical (tables, matrix, agenda); quiet, spacious, and readable elsewhere.
- **Focal Point**: Boldness is reserved for urgency and critical deadlines (such as live countdowns and at-risk alerts), avoiding arbitrary decorative clutter.
- **Copy & Actions**: Plain English in sentence case with active verbs ("Mark as submitted", "Copy reminder", "Log email").

## 2. Colour Palette

### Surface & Ink Tokens

| Token            | Light Hex | Dark Hex  | Usage                                           |
| :--------------- | :-------- | :-------- | :---------------------------------------------- |
| `canvas`         | `#f8fafc` | `#0b1120` | Application window background                   |
| `surface`        | `#ffffff` | `#151f32` | Cards, modals, sidebars, panel backgrounds      |
| `surface-raised` | `#f1f5f9` | `#1e293b` | Hover states, active table rows, chips          |
| `border-subtle`  | `#e2e8f0` | `#223147` | Subtle dividers, inactive borders               |
| `border-strong`  | `#cbd5e1` | `#334155` | Input borders, card outlines                    |
| `text-primary`   | `#0f172a` | `#f1f5f9` | Primary headings, titles, active labels         |
| `text-secondary` | `#475569` | `#94a3b8` | Subheadings, table headers, descriptions        |
| `text-muted`     | `#64748b` | `#64748b` | Timestamps, placeholder text, quiet notes       |
| `accent-primary` | `#2563eb` | `#3b82f6` | Primary action buttons, selection indicators    |
| `urgent-red`     | `#dc2626` | `#ef4444` | Deadlines < 48 hours, at-risk flags, error text |

## 3. Status Map

Every application status possesses a distinct label, semantic color token, and accessible icon.

| Status         | Label        | Color Token | Hex (Light / Dark)    | Icon           |
| :------------- | :----------- | :---------- | :-------------------- | :------------- |
| `exploring`    | Exploring    | Slate       | `#64748b` / `#94a3b8` | `Compass`      |
| `applying`     | Applying     | Cobalt      | `#2563eb` / `#60a5fa` | `Pencil`       |
| `submitted`    | Submitted    | Indigo      | `#4f46e5` / `#818cf8` | `CheckCircle2` |
| `interviewing` | Interviewing | Amber       | `#d97706` / `#fbbf24` | `Users`        |
| `admitted`     | Admitted     | Emerald     | `#059669` / `#34d399` | `Award`        |
| `waitlisted`   | Waitlisted   | Cyan        | `#0891b2` / `#22d3ee` | `Clock`        |
| `accepted`     | Accepted     | Green       | `#16a34a` / `#4ade80` | `Sparkles`     |
| `declined`     | Declined     | Rose        | `#e11d48` / `#fb7185` | `XCircle`      |
| `withdrawn`    | Withdrawn    | Gray        | `#64748b` / `#94a3b8` | `MinusCircle`  |
| `rejected`     | Rejected     | Neutral     | `#475569` / `#6b7280` | `Ban`          |

## 4. Typography

- **Interface Font**: System UI sans-serif stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`).
- **Tabular & Clock Font**: Tabular figures monospaced font stack for dates, times, countdowns, and currency figures (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`).

### Type Scale

- `text-xs`: 0.75rem (12px) / line-height: 1rem — Microcopy, status chips, tags.
- `text-sm`: 0.875rem (14px) / line-height: 1.25rem — Standard body, table cells, form labels.
- `text-base`: 1rem (16px) / line-height: 1.5rem — Primary card titles, dialogue body.
- `text-lg`: 1.125rem (18px) / line-height: 1.75rem — Section headings.
- `text-xl`: 1.25rem (20px) / line-height: 1.75rem — Page headers.
- `text-2xl`: 1.5rem (24px) / line-height: 2rem — Key metrics, countdown display.

## 5. Spacing & Density

- Base unit: 4px.
- Spacing values: 4px (`gap-1`), 8px (`gap-2`), 12px (`gap-3`), 16px (`gap-4`), 24px (`gap-6`), 32px (`gap-8`).
- Table rows: Compact 36px height for data density with 8px horizontal cell padding.
- Cards: 16px padding with subtle 1px border.
