# Track Your PhD Application

A private, local-first desktop application designed to keep track of graduate program applications, deadlines across time zones, letters of recommendation, faculty outreach, and funding offers.

Built with [Tauri 2](https://v2.tauri.app/), React, TypeScript, Tailwind CSS, and SQLite.

---

## What and Why

During graduate application season, applicants juggle dozens of moving parts:

1. **What is due next, and exactly when in my time zone?** Deadlines occur at specific wall-clock times in universities' respective time zones (e.g., 8:59 PM Pacific), not just arbitrary midnight dates.
2. **What am I waiting on?** Tracking recommendation letter submissions across multiple programs, official score reports, fee waivers, faculty emails, and interview calls.
3. **Where does each application stand?** Consolidating requirements, readiness scores, and status updates in one clear, responsive dashboard.

This application is built to answer these three questions every day with zero cognitive overhead, keyboard shortcuts, and clear visual cues.

## Privacy Statement

- **100% Local-First**: All application data is stored in a local SQLite database on your device.
- **Zero Telemetry**: No tracking, analytics, cloud accounts, or runtime network calls.
- **No Password Storage**: The app stores portal links and usernames only, never passwords.
- **Safe Backups**: Automatic local database backups are written directly to your OS application data folder.

## Where Data Lives

All application data and automatic backups reside strictly within your OS application data directory:

- **Windows**: `%APPDATA%\com.trackyourphdapplication.app\`
- **macOS**: `~/Library/Application Support/com.trackyourphdapplication.app/`
- **Linux**: `~/.local/share/com.trackyourphdapplication.app/`

Database backups are automatically placed in the `backups/` subdirectory. Never place the live working database in a cloud-synced folder (such as Dropbox, OneDrive, or iCloud) to avoid database lock contention or corruption.

## Development Setup

### Prerequisites

- **Node.js**: v22 LTS (managed via `.nvmrc`)
- **Rust**: Stable (managed via `rust-toolchain.toml`, with `clippy` and `rustfmt`)
- Platform-specific Tauri v2 prerequisites:
  - **Windows**: Microsoft C++ Build Tools and WebView2 (installed by default on Windows 10/11)
  - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - **macOS**: Xcode Command Line Tools

### Setup and Running

```bash
# Install dependencies
npm ci

# Start the desktop application in development mode
npm run tauri dev

# Run all verification checks (formatting, linting, typecheck, tests, cargo clippy/test)
npm run verify

# Build production installers
npm run tauri build
```

## Important Notes

### Calendar (.ics) Alarms

Exported `.ics` calendar files include RFC 5545 `VALARM` reminder alerts for milestone lead times. Please note that different calendar applications (Google Calendar, Apple Calendar, Microsoft Outlook) differ in how they parse and trigger alarms imported from local `.ics` files.

### Unsigned Builds Notice

Community and pre-release builds are unsigned. When installing:

- **Windows**: Windows SmartScreen may show an alert ("Windows protected your PC"). Click **More info** and then **Run anyway**.
- **macOS**: Apple Gatekeeper may alert that the developer cannot be verified. Right-click the app, choose **Open**, and confirm.

## License

This project is licensed under the [MIT License](LICENSE).
