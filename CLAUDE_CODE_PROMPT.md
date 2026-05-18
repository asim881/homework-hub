# Homework Hub — Claude Code Handoff Prompt

Paste everything below this line as your first message to Claude Code.

---

I'm building a kids homework web app called **Homework Hub**. I have two files to share with you:
- `homework-hub-v2.html` — the main app
- `apps-script-proxy.js` — a Google Apps Script proxy (for reference, not actively used yet)

## What the app does
A single HTML file that:
- Shows assignments for 3 kids: Fatima (Grade 5 ⚽), Rayyan (Grade 5 🚀), Haniya (Grade 4 🌻)
- Calls the Anthropic API (Claude Haiku) to **dynamically generate** weekly assignments per subject
- Calls the Anthropic API to **grade** typed answers with per-question feedback
- Tracks progress in localStorage
- Is hosted on Google Sites via HTML embed

## Kid profiles
- **Fatima** Grade 5, Ontario curriculum, loves soccer + Scratch game design, heading toward JavaScript
- **Rayyan** Grade 5, strong in Math, learning Python from scratch (beginner), prior Scratch experience
- **Haniya** Grade 4, loves Scratch storytelling, struggles with English comprehension (needs scaffolding: sentence starters, shorter passages, literal questions before inference)

## Weekly schedule
- Mon: Math | Tue: English | Wed: Computer Literacy | Thu: Science | Fri: Flex
- ~30 min/day weekdays, 1 hr weekend project sessions
- Questions are AI-generated fresh each week based on week number + kid's prior weak areas

## Current API setup
- Using `FALLBACK_API_KEY` hardcoded in the HTML (direct browser call to Anthropic API)
- `PROXY_URL` is empty — the Google Apps Script proxy is not yet connected
- Model: `claude-haiku-4-5-20251001`

## Current issues to fix
1. **Layout breaks inside Google Sites iframe** — the app is embedded via Google Sites and the iframe constrains width/height. Symptoms:
   - Login card is cut off on the left
   - Answer text boxes are very narrow (not full width)
   - Login screen and app screen sometimes both visible simultaneously
   - App needs to render properly inside a ~900px tall iframe at variable widths
2. **Screens use `min-height: 900px`** but Google Sites iframe doesn't respect this cleanly — need a better approach that works inside an iframe without relying on viewport units

## What I need you to do
1. Fix all iframe/Google Sites layout issues so the app renders correctly when embedded
2. Start a local server (`python3 -m http.server` or similar) so I can preview changes at localhost
3. Test that the login screen, homework screen, and dashboard all render correctly at ~800px width
4. Once layout is confirmed working, help me re-embed the updated file in Google Sites

## Architecture notes
- No build tools, no npm — pure single HTML file with vanilla JS
- All Claude API calls use `anthropic-dangerous-direct-browser-access: true` header for browser-direct calls
- Progress stored in localStorage under keys: `hwProgress`, `hwStartDate`, `assign-{kid}-w{week}-d{day}`
- Week number calculated from `hwStartDate` (set on first launch, stored in localStorage)
- Assignment generation is cached in localStorage so questions don't regenerate mid-week

## Out of scope for now
- Google Apps Script proxy setup (deferred)
- Google Sheets progress sync (deferred)
- The app works fine with the hardcoded API key for now

## Future features (for context only, don't build yet)
- Parent dashboard accessible separately (not requiring kid login)
- Weekly email summary to parents
- Google Sheets sync for cross-device progress tracking
- Eventually connect the Apps Script proxy so API key is off the browser

Please start by reading the HTML file, spinning up a local server, and fixing the iframe layout issues.
