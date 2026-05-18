# Homework Hub — Project Context

## 1. Project Overview

**What:** AI-powered homework app for three kids — Fatima (Grade 5), Rayyan (Grade 5), Haniya (Grade 4). Kids pick their name, get AI-generated weekly assignments, submit answers, and receive per-question AI grading and feedback.

**Why:** Structured daily homework with automatic marking, no parent effort per session. Progress syncs to Google Sheets so parents can monitor without being in the room.

**Current Status:**
- ✅ Full app working on kids' Chromebooks via Google Sites
- ✅ Claude Haiku generates questions and grades answers via Apps Script proxy
- ✅ Progress syncs to Google Sheets (Overview + per-kid tabs + weekly summaries)
- ✅ Parent dashboard PIN-gated (PIN: 3090) and auto-refreshing
- ✅ Hardcoded API key removed — proxy is sole API path
- ✅ Feature backlog tracked in Notion (with Commit field for version tracing)
- ✅ Hosted on GitHub Pages — no more Family Link atari-embeds prompt
- ✅ Version controlled in git (github.com/asim881/homework-hub)
- ⚠️ Apps Script needs redeployment (code changes not yet live — causing "Failed to fetch")
- ⚠️ Old Anthropic API key (sk-ant-api03-Y89b-Xf_...) needs rotating in Anthropic console
- ⚠️ Add asim881.github.io to Family Link approved sites for each kid

---

## 2. Architecture & Key Decisions

### Why each component exists

| Component | Role | Why chosen |
|---|---|---|
| `homework-hub-v2.html` | Main app — login, questions, grading | Single file = works in Google Sites iframe, no build tools |
| `apps-script-proxy.js` | Server-side proxy | Keeps API key off the browser; free Google infra; native Sheets access |
| Google Sheets | Progress storage | Free, shareable with wife, Apps Script writes natively |
| Claude Haiku | Question generation + grading | Fastest/cheapest Claude model; good enough for Grade 4-5 content |
| Google Sites | Hosting | Free, works on Chromebooks, no domain/server needed |
| `parent-dashboard.html` | Parent progress view | Reads from Sheets via same proxy; auto-refreshes every 2 min |
| localStorage | Client-side state | Caches assignments (avoids duplicate API calls) |

### Critical architectural note
All browser → Anthropic API calls go through the Apps Script proxy. Fetch requests use `Content-Type: text/plain` (not `application/json`) to avoid CORS preflight.

### File structure
```
Homework Hub/
├── PROD/                         # Deploy-ready files — served via GitHub Pages
│   ├── homework-hub-v2.html      # Main kids app
│   ├── parent-dashboard.html     # Parent progress dashboard
│   ├── apps-script-proxy.js      # Google Apps Script code
│   └── architecture.html         # Visual architecture diagram
├── DEV/                          # Working copies — test locally before promoting
│   ├── homework-hub-v2.html
│   ├── parent-dashboard.html
│   └── apps-script-proxy.js
├── index.html                    # Root redirect → PROD/homework-hub-v2.html (GitHub Pages)
├── CLAUDE_CODE_PROMPT.md
└── CONTEXT.md                    # This file
```

**Dev workflow:** Edit DEV/ → test by opening HTML directly in browser (proxy URL works from file://) → copy to PROD/ → commit and push to GitHub → GitHub Pages deploys automatically.

**Live URLs:**
- Kids app: https://asim881.github.io/homework-hub/
- Parent dashboard: https://asim881.github.io/homework-hub/PROD/parent-dashboard.html

**GitHub repo:** https://github.com/asim881/homework-hub (public)
**Hosting:** GitHub Pages from main branch / root. index.html redirects to PROD/homework-hub-v2.html.
**Why GitHub Pages:** Google Sites embedded HTML via a randomly-numbered atari-embeds.googleusercontent.com subdomain that changed every browser tab — incompatible with Family Link whitelisting.

### Key constants in PROD/homework-hub-v2.html
```javascript
const PROXY_URL = 'https://script.google.com/macros/s/AKfycbxB-.../exec'; // Apps Script URL
const FALLBACK_API_KEY = ''; // Intentionally empty — proxy is sole API path
```

### Apps Script proxy actions
| Action | Handler | Description |
|---|---|---|
| *(default)* | `handleClaude` | Forwards prompt to Anthropic API |
| `saveProgress` | `handleSaveProgress` | Writes session results to Sheets |
| `getData` | `handleGetData` | Returns Overview sheet rows for dashboard |
| `getKidData` | `handleGetKidData` | Returns per-question rows for a kid/week/day |
| `saveSettings` | `handleSaveSettings` | Saves parent topic hints to Settings tab |
| `getSettings` | `handleGetSettings` | Returns topic hint for a specific kid |

### Schedule
- Mon: Math · Tue: English · Wed: Computer Literacy · Thu: Science · Fri: Social Studies
- Sat: Math + Financial Literacy (60 min) · Sun: French + Creative (60 min)

---

## 3. Recent Work (last session — 2026-05-10 to 2026-05-12)

### Security (High priority — both Done in Notion)
- **Removed hardcoded API key** — `FALLBACK_API_KEY` cleared in `homework-hub-v2.html`; proxy is now sole path
- **Parent dashboard PIN gate** — full-screen overlay on load, PIN `3090`, session-persisted via `sessionStorage`

### Parent dashboard improvements (Medium priority — all Done in Notion)
- **Google Sheets colour formatting** — `%` cell now colour-coded green/yellow/red in Overview and kid tabs; batch row inserts replace one-at-a-time inserts
- **Multi-week trend view** — kid cards show CSS bar chart of weekly scores once 2+ weeks of data exist
- **Drill-down into questions** — history rows are clickable; expands inline to show Q#, question, answer, score, AI feedback (lazy-loaded via new `getKidData` proxy action)
- **Topic hints for parents** — new section in parent dashboard (behind PIN) with per-kid text areas; hints saved to Google Sheets `Settings` tab; main app fetches hint before generating assignment and injects as `Parent focus note` into Claude prompt

### Infrastructure
- **PROD/DEV folder split** — all files now in `PROD/` (deploy-ready) or `DEV/` (for local testing); both folders use identical filenames
- **New Notion backlog item** — "Hide future days in kids' weekly view" (UX, Medium)

### Bugs resolved
| Bug | Cause | Fix |
|---|---|---|
| "Failed to fetch" | Apps Script not yet redeployed after code changes | Redeploy required (see Next Steps) |

---

## 4. Next Steps

### Immediate (unblocking)
1. **Add asim881.github.io to Family Link** — in Family Link app, add `asim881.github.io` to approved sites for Fatima, Rayyan, and Haniya. One-time, never changes.
2. **Redeploy Apps Script** — paste `PROD/apps-script-proxy.js` into script.google.com → Deploy → Manage deployments → Edit → New version → Deploy. This fixes the current "Failed to fetch" error.
3. **Rotate old Anthropic API key** — go to console.anthropic.com → API Keys → disable `sk-ant-api03-Y89b-Xf_...` → create new key → update `ANTHROPIC_API_KEY` Script Property.

### Dev workflow going forward
- Edit DEV/ files → test locally → copy to PROD/ → `git add`, `git commit -m "..."`, `git push`
- GitHub Pages auto-deploys within ~60 seconds of each push
- When marking a Notion backlog item Done, paste the short git SHA into the Commit field

### Backlog (priority order)
4. **Achievement badges** (High) — badges on kid home screen (First Week Done, Perfect Score, etc.)
5. **Weekly email summary** (Medium) — Sunday trigger via Apps Script `MailApp`; sends weekly results for all 3 kids to parents.
6. **Hide future days in kids' view** (Medium) — filter DAYS array to only show up to today's day of week; frontend-only change in `homework-hub-v2.html`.
7. **Cross-device progress sync** (Medium) — localStorage is per-device; needs server-side session or resume-from-sheet flow.

**Full backlog:** https://www.notion.so/5efe8f6e726d4bd0be47ceea3c1f75d9

---

## 5. Setup & Dependencies

### No install required
No npm, no build tools, no dependencies. Everything is vanilla HTML/JS.

### Local testing
Open any file in `DEV/` directly in the browser — the `PROXY_URL` is absolute and works from `file://`.

### Dev reset (clear all localStorage)
Double-click the "Homework Hub v2" text at the bottom of the app.

### Google Apps Script
- URL: https://script.google.com (Homework Hub project)
- Script Properties required:
  - `ANTHROPIC_API_KEY` — Anthropic API key
  - `SPREADSHEET_ID` — Google Sheets ID (just the ID between `/d/` and `/edit`, not the full URL)
- After any code change: Deploy → Manage deployments → Edit → New version → Deploy
- Web App URL stays the same after redeployment

### Google Sheets
- Tabs: Overview, Fatima, Rayyan, Haniya, Settings
- Tabs auto-created on first use
- Share with wife via standard Google Sheets sharing

### Google Sites
- After editing HTML: open Sites editor → find embed → edit → paste new HTML → Publish
- Always use files from `PROD/` — never `DEV/`

### Family Link approved domains (add to each kid's account)
- `sites.google.com`
- `script.google.com`
- `script.googleusercontent.com`
- `atari-embeds.googleusercontent.com`
