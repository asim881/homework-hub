# Homework Hub — Project Context

## 1. Project Overview

**What:** AI-powered homework app for three kids — Fatima (Grade 5), Rayyan (Grade 5), Haniya (Grade 4). Kids pick their name, get AI-generated weekly assignments, submit answers, and receive per-question AI grading and feedback.

**Why:** Structured daily homework with automatic marking, no parent effort per session. Progress syncs to Google Sheets so parents can monitor without being in the room.

**Current Status:**
- ✅ Full app live on GitHub Pages — asim881.github.io/homework-hub/
- ✅ Claude Haiku generates questions and grades answers via Cloudflare Worker
- ✅ Progress syncs to Google Sheets (Overview + per-kid tabs + weekly summaries)
- ✅ Parent dashboard PIN-gated (PIN: 3090) and auto-refreshing
- ✅ Hardcoded API key removed — Worker is sole Claude API path
- ✅ Feature backlog tracked in Notion (with Commit field for version tracing)
- ✅ Version controlled in git — github.com/asim881/homework-hub (public)
- ✅ Cloudflare Worker proxy — never expires, no re-authorization needed
- ⚠️ Add asim881.github.io to Family Link approved sites for each kid

---

## 2. Architecture & Key Decisions

### Why each component exists

| Component | Role | Why chosen |
|---|---|---|
| `index.html` | Main app — login, questions, grading | Single file = no build tools, works on any Chromebook |
| `cloudflare-worker.js` | Claude API proxy | Never expires, no OAuth, API key stored as encrypted secret |
| `apps-script-proxy.js` | Google Sheets proxy | Native SpreadsheetApp access; free Google infra |
| Google Sheets | Progress storage | Free, shareable with wife, Apps Script writes natively |
| Claude Haiku | Question generation + grading | Fastest/cheapest Claude model; good enough for Grade 4-5 content |
| `parent-dashboard.html` | Parent progress view | Reads from Sheets via Apps Script; auto-refreshes every 2 min |
| localStorage | Client-side state | Caches assignments (avoids duplicate API calls) |

### Split proxy architecture (as of 2026-05-30)

All Claude API calls (question generation, grading, topic hints) route through the **Cloudflare Worker**. Google Sheets operations (save progress, read dashboard data, settings) still route through the **Apps Script**.

This split permanently resolves the recurring "Failed to fetch" issue caused by Google Apps Script OAuth token expiry — the Worker uses an encrypted API key secret with no OAuth involved.

```
Browser → CLAUDE_URL  (Cloudflare Worker) → Anthropic API   [questions/grading]
Browser → PROXY_URL   (Apps Script)        → Google Sheets   [progress/settings]
```

### Key constants in index.html
```javascript
const CLAUDE_URL = 'https://homework-hub.asim-aijaz.workers.dev'; // Cloudflare Worker — Claude calls
const PROXY_URL  = 'https://script.google.com/macros/s/AKfycbxB-.../exec'; // Apps Script — Sheets only
const FALLBACK_API_KEY = ''; // Intentionally empty
```

### Cloudflare Worker
- **URL:** https://homework-hub.asim-aijaz.workers.dev
- **Secret:** `ANTHROPIC_API_KEY` stored as encrypted variable in Cloudflare dashboard
- **Code:** `cloudflare-worker.js` in repo (reference copy — actual deployed code is in Cloudflare dashboard)
- **Free tier:** 100,000 requests/day — more than enough

### Apps Script proxy actions (Sheets only)
| Action | Handler | Description |
|---|---|---|
| `saveProgress` | `handleSaveProgress` | Writes session results to Sheets |
| `getData` | `handleGetData` | Returns Overview sheet rows for dashboard |
| `getKidData` | `handleGetKidData` | Returns per-question rows for a kid/week/day |
| `saveSettings` | `handleSaveSettings` | Saves parent topic hints to Settings tab |
| `getSettings` | `handleGetSettings` | Returns topic hint for a specific kid |

### File structure
```
Homework Hub/
├── index.html                    # Kids app — served at asim881.github.io/homework-hub/
├── parent-dashboard.html         # Parent progress dashboard
├── cloudflare-worker.js          # Cloudflare Worker source (reference copy)
├── apps-script-proxy.js          # Google Apps Script code (paste into script.google.com)
├── architecture.html             # Visual architecture diagram
├── CLAUDE_CODE_PROMPT.md
└── CONTEXT.md                    # This file
```

### Schedule
- Mon: Math · Tue: English · Wed: Computer Literacy · Thu: Science · Fri: Social Studies
- Sat: Math + Financial Literacy (60 min) · Sun: French + Creative (60 min)

**Live URLs:**
- Kids app: https://asim881.github.io/homework-hub/
- Parent dashboard: https://asim881.github.io/homework-hub/parent-dashboard.html

**GitHub repo:** https://github.com/asim881/homework-hub (public)
**Hosting:** GitHub Pages from main branch / root.

---

## 3. Dev Workflow

**Branch workflow:**
1. Create a feature/fix branch: `git checkout -b fix/description` or `feat/description`
2. Make changes, test locally (open index.html in browser)
3. Commit and push branch to GitHub
4. Open Pull Request → merge to `main`
5. GitHub Pages auto-deploys in ~60 seconds

**Never commit directly to main.** Always use a branch + PR.

**When completing a Notion backlog item:**
1. Set Status → Done
2. Paste the short git SHA into the **Commit** field
3. Update Notes if implementation differed from plan

---

## 4. Recent Work

### 2026-05-30

**Bug fix: Initial day selection mismatch** (PR #1, commit `53a1e78`)
- `renderDayTabs()` was called before `currentDay = today`, so Monday tab was always highlighted on load regardless of actual day
- Fix: set `currentDay` before calling `renderDayTabs()`

**Cloudflare Worker proxy** (commit `acdfbc7`)
- Added Cloudflare Worker to permanently replace Apps Script as the Claude API proxy
- Apps Script retained for Google Sheets sync only
- `CLAUDE_URL` constant added; `callClaude()` uses `CLAUDE_URL || PROXY_URL`
- Eliminates the weekly Google OAuth re-authorization prompt

**GitHub Pages setup**
- Repo made public; Pages enabled from main branch / root
- Live at https://asim881.github.io/homework-hub/

---

## 5. Setup & Dependencies

### No install required
No npm, no build tools, no dependencies. Everything is vanilla HTML/JS.

### Local testing
Open `index.html` directly in the browser — `CLAUDE_URL` and `PROXY_URL` are absolute URLs and work from `file://`.

### Dev reset (clear all localStorage)
Double-click the "Homework Hub v2" text at the bottom of the app.

### Cloudflare Worker
- Dashboard: dash.cloudflare.com → Workers & Pages → homework-hub
- To update code: Edit code → paste → Deploy
- To rotate API key: Settings → Variables and Secrets → edit `ANTHROPIC_API_KEY`

### Google Apps Script
- URL: https://script.google.com (Homework Hub project)
- Script Properties required:
  - `ANTHROPIC_API_KEY` — Anthropic API key (also used by Cloudflare Worker)
  - `SPREADSHEET_ID` — Google Sheets ID
- After any code change: Deploy → Manage deployments → Edit → New version → Deploy

### Google Sheets
- Tabs: Overview, Fatima, Rayyan, Haniya, Settings
- Tabs auto-created on first use

### Family Link approved domains (add to each kid's account)
- `asim881.github.io`
- `script.google.com`
- `script.googleusercontent.com`

### Full Notion backlog
https://www.notion.so/5efe8f6e726d4bd0be47ceea3c1f75d9
