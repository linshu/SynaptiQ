# SynaptiQ — Design Document

## Overview

SynaptiQ is a web application for analyzing **Multi-Electrode Array (MEA)** spike data
recorded from neurons in cell culture using Axion Biosystems equipment. It computes
spike frequency (Hz) and average amplitude (mV) per well from spike list CSV exports,
saves results to a database, and provides a history view of past analyses.

---

## Data Format

**Source**: Axion Biosystems AxIS software — Spike List CSV export

### File Structure

The CSV has a mixed layout: metadata in columns 1–2, spike data in columns 3–5.

| Col index | Header | Example value |
|-----------|--------|---------------|
| 0 | Investigator / metadata key | `Recording Name` |
| 1 | Metadata value | `3w_HN1 Neurospheres Batch 8 day 60` |
| 2 | Time (seconds) | `00000.006240` |
| 3 | Electrode | `F5_22` |
| 4 | Amplitude (mV) | `0.027` |

- Spike rows are identified by: `col[2]` matches `/^\d+\.\d+$/` AND `col[3]` matches `/^[A-Z]\d+_\d+$/`
- Footer section starts at the `Well Information` row — parsing stops there
- **Well ID** = first 2 characters of Electrode (e.g. `F5` from `F5_22`)
- **Recording duration** = `max(time)` across all spike rows (seconds)

### Analysis

For each well:
- `frequency_hz = spike_count / recording_duration`
- `avg_amplitude_mv = mean(amplitude)` across all spikes in that well

---

## Architecture

```
SynaptiQ/
├── src/
│   ├── components/
│   │   ├── FileLoader.jsx        # Unified load panel (local / Google / OneDrive)
│   │   ├── ResultsTable.jsx      # Well ID, Hz, avg amplitude display
│   │   ├── DownloadButton.jsx    # Export CSV (Well ID, Frequency Hz)
│   │   └── HistoryList.jsx       # Past analyses from database
│   ├── utils/
│   │   └── parseSpikeCsv.js      # CSV parsing + spike analysis logic
│   ├── App.jsx
│   └── main.jsx
├── api/
│   ├── save-analysis.js          # POST → save recording + well results to Postgres
│   └── get-analyses.js           # GET  → list past recordings with results
├── DESIGN.md
├── vercel.json
└── .env.local                    # API keys (not committed)
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite | Fast dev server, optimized builds |
| Backend | Vercel Serverless Functions | Co-deployed with frontend, zero config |
| Database | Vercel Postgres (Neon) | Native Vercel integration, serverless Postgres |
| Google Drive | Google Identity Services (GIS) + Picker API | OAuth2 on demand |
| OneDrive | MSAL.js + Microsoft Graph API | OAuth2 on demand |
| Deployment | Vercel | CLI deploy, env vars + DB in one place |

---

## Database Schema

```sql
-- One row per uploaded/analyzed recording
CREATE TABLE recordings (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,          -- filename or recording name from CSV header
  source       TEXT NOT NULL,          -- 'local' | 'google_drive' | 'onedrive'
  duration_s   FLOAT,                  -- total recording duration in seconds
  total_spikes INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- One row per well per recording
CREATE TABLE well_results (
  id               SERIAL PRIMARY KEY,
  recording_id     INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
  well_id          TEXT NOT NULL,       -- e.g. 'F5', 'A4'
  spike_count      INTEGER,
  frequency_hz     FLOAT,
  avg_amplitude_mv FLOAT
);
```

---

## UI Flow

### File Loading

Single **Load File** panel with three options presented side by side:

1. **Local File** — drag-and-drop zone or file browser. No auth required.
2. **Google Drive** — button triggers Google SSO on click → Google Picker → CSV
   downloaded client-side via Drive API.
3. **OneDrive** — button triggers Microsoft SSO on click → OneDrive file browser
   (MSAL + Graph API) → CSV downloaded client-side.

> Auth is on-demand — no persistent login state required.

### Results

After parsing:
- Summary stats: recording name, duration, total spike count, active wells
- Table: Well ID | Spike Count | Frequency (Hz) | Avg Amplitude (mV)
- **Download CSV** exports two columns: `Well ID, Frequency (Hz)`
- **Save to History** button posts results to `/api/save-analysis`

### History

Collapsible panel listing past recordings (from Vercel Postgres), with expandable
well-level details.

---

## Environment Variables

```
# Google Drive
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=

# Microsoft OneDrive
VITE_MS_CLIENT_ID=

# Vercel Postgres (auto-injected by Vercel when DB is linked)
POSTGRES_URL=
```

---

## Deployment

1. `vercel login`
2. `vercel link` (links to Vercel project)
3. In Vercel dashboard: Storage → Create Postgres database → link to project
4. `vercel env pull .env.local` (pulls DB connection string)
5. `vercel deploy` (or push to GitHub for auto-deploy)

---

## Configuration Notes

### Google Drive Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Drive API** and **Google Picker API**
3. Create OAuth 2.0 Client ID (Web application type)
4. Add your Vercel deployment URL to "Authorized JavaScript origins"
5. Create an API Key; restrict it to Picker API
6. Set `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY` in Vercel env vars

### Microsoft OneDrive Setup

1. Register an app in [Azure Portal](https://portal.azure.com) → App registrations
2. Platform: Single-page application
3. Add your Vercel deployment URL as a redirect URI
4. Add Microsoft Graph permission: `Files.Read`
5. Set `VITE_MS_CLIENT_ID` in Vercel env vars
