// ═══════════════════════════════════════════════════════════════
// HOMEWORK HUB — Google Apps Script Proxy
// ═══════════════════════════════════════════════════════════════
//
// SETUP (do this once):
//
// 1. Go to script.google.com → New project → paste this entire file
//
// 2. Add Script Properties:
//    Extensions → Apps Script → Project Settings → Script Properties
//    Add two properties:
//      ANTHROPIC_API_KEY  →  sk-ant-... (your key)
//      SPREADSHEET_ID     →  (from your Google Sheet URL, see step 3)
//
// 3. Create Google Sheet:
//    Go to sheets.google.com → create a new blank spreadsheet
//    Name it "Homework Hub Progress"
//    Copy the ID from the URL:
//      https://docs.google.com/spreadsheets/d/[COPY_THIS_PART]/edit
//    Paste it as the SPREADSHEET_ID property in step 2
//
// 4. Share the spreadsheet with your wife:
//    Click Share → enter her Google email → Viewer (or Editor)
//
// 5. Deploy as Web App:
//    Deploy → New deployment → Web app
//    Execute as: Me
//    Who has access: Anyone
//    Click Deploy → copy the Web App URL
//
// 6. Paste that URL into homework-hub-v2.html as the PROXY_URL value
//
// ═══════════════════════════════════════════════════════════════

function getProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function doGet(e) {
  return jsonOut({ status: 'Homework Hub proxy is running' });
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'saveProgress') return handleSaveProgress(body);
    if (body.action === 'getData')     return handleGetData(body);
    if (body.action === 'getKidData')   return handleGetKidData(body);
    if (body.action === 'saveSettings') return handleSaveSettings(body);
    if (body.action === 'getSettings')  return handleGetSettings(body);
    return handleClaude(body);
  } catch (err) {
    return jsonOut({ error: err.toString() });
  }
}

// ─── CLAUDE API ───────────────────────────────────────────────────────────────

function handleClaude(body) {
  const key = getProp('ANTHROPIC_API_KEY');
  if (!key) return jsonOut({ error: 'ANTHROPIC_API_KEY not set in Script Properties' });

  const prompt = body.prompt;
  const maxTokens = body.max_tokens || 1000;
  if (!prompt) return jsonOut({ error: 'No prompt provided' });

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code !== 200) return jsonOut({ error: `Anthropic error ${code}: ${text}` });

  const data = JSON.parse(text);
  return jsonOut({ text: data.content[0].text });
}

// ─── GOOGLE SHEETS SYNC ───────────────────────────────────────────────────────

const KID_COLORS = {
  Fatima: { bg: '#ffe0ed', accent: '#ff6b9d' },
  Rayyan: { bg: '#daeeff', accent: '#4e9af1' },
  Haniya: { bg: '#dff2e0', accent: '#7bc67e' }
};

const OVERVIEW_COLS = ['Kid', 'Week', 'Date', 'Day', 'Subject', 'Topic', 'Score', 'Out Of', '%', 'Status'];
const KID_COLS     = ['Week', 'Date', 'Day', 'Subject', 'Topic', 'Q#', 'Question', 'Their Answer', 'Score', 'Feedback', 'Day Score', 'Day Total', 'Day %'];

function handleSaveProgress(body) {
  const ssId = getProp('SPREADSHEET_ID');
  if (!ssId) return jsonOut({ error: 'SPREADSHEET_ID not set in Script Properties' });

  const ss = SpreadsheetApp.openById(ssId);

  // Ensure all four tabs exist in the right order on first run
  ensureAllSheets(ss);

  const { kid, week, date, day, subject, topic, score, total, questions } = body;
  const pct    = Math.round((score / total) * 100);
  const status = pct >= 75 ? '✅' : pct >= 50 ? '⚠️' : '❌';

  appendOverviewRow(ss, { kid, week, date, day, subject, topic, score, total, pct, status });
  appendKidRows(ss,     { kid, week, date, day, subject, topic, score, total, pct, questions });
  maybeWriteWeeklySummary(ss, kid, week);

  return jsonOut({ ok: true });
}

// ─── SHEET SETUP ──────────────────────────────────────────────────────────────

function ensureAllSheets(ss) {
  getOrMakeSheet(ss, 'Overview');
  ['Fatima', 'Rayyan', 'Haniya'].forEach(kid => getOrMakeSheet(ss, kid));
}

function getOrMakeSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (sheet) return sheet;

  sheet = ss.insertSheet(name);
  const isOverview = name === 'Overview';
  const headers    = isOverview ? OVERVIEW_COLS : KID_COLS;
  const headerBg   = isOverview ? '#1a1a2e' : (KID_COLORS[name]?.accent || '#4e9af1');

  const hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers])
        .setBackground(headerBg)
        .setFontColor('white')
        .setFontWeight('bold')
        .setFontSize(11);
  sheet.setFrozenRows(1);

  if (isOverview) {
    [80, 60, 90, 60, 130, 170, 60, 60, 55, 60].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  } else {
    sheet.setColumnWidth(7, 300);   // Question
    sheet.setColumnWidth(8, 260);   // Their Answer
    sheet.setColumnWidth(10, 300);  // Feedback
  }
  return sheet;
}

// ─── WRITE ROWS ───────────────────────────────────────────────────────────────

function appendOverviewRow(ss, { kid, week, date, day, subject, topic, score, total, pct, status }) {
  const sheet = ss.getSheetByName('Overview');
  const color = KID_COLORS[kid] || { bg: '#f5f5f5' };
  const pctBg = pct >= 75 ? '#d4edda' : pct >= 50 ? '#fff3cd' : '#fde8e8';
  const pctFg = pct >= 75 ? '#1a6b30' : pct >= 50 ? '#7a5c00' : '#a02020';

  sheet.insertRowAfter(1);
  const r = sheet.getRange(2, 1, 1, OVERVIEW_COLS.length);
  r.setValues([[kid, week, date, day, subject, topic, score, total, pct + '%', status]])
   .setBackground(color.bg)
   .setFontColor('#1a1a2e')
   .setFontSize(10)
   .setVerticalAlignment('middle');
  sheet.getRange(2, 9).setBackground(pctBg).setFontColor(pctFg).setFontWeight('bold');
  sheet.getRange(2, 10).setFontWeight('bold');
}

function appendKidRows(ss, { kid, week, date, day, subject, topic, score, total, pct, questions }) {
  const sheet = ss.getSheetByName(kid);
  const color = KID_COLORS[kid] || { bg: '#f5f5f5' };
  const pctBg = pct >= 75 ? '#d4edda' : pct >= 50 ? '#fff3cd' : '#fde8e8';
  const pctFg = pct >= 75 ? '#1a6b30' : pct >= 50 ? '#7a5c00' : '#a02020';

  const rows = questions.map((q, i) => [
    week, date, day, subject, topic,
    i + 1,
    q.q,
    q.answer   || '(no answer)',
    q.score,
    q.feedback || '',
    score, total, pct + '%'
  ]);

  const n = rows.length;
  sheet.insertRowsAfter(1, n);
  const range = sheet.getRange(2, 1, n, KID_COLS.length);
  range.setValues(rows)
       .setBackground(color.bg)
       .setFontColor('#1a1a2e')
       .setFontSize(10)
       .setVerticalAlignment('top');
  sheet.getRange(2, 13, n, 1).setBackground(pctBg).setFontColor(pctFg).setFontWeight('bold');
  sheet.getRange(2, 7, n, 4).setWrap(true);
}

// ─── WEEKLY SUMMARY ───────────────────────────────────────────────────────────

function maybeWriteWeeklySummary(ss, kid, week) {
  const overviewSheet = ss.getSheetByName('Overview');
  if (!overviewSheet) return;

  const summaryLabel = `📊 ${kid} — Week ${week}`;
  const data = overviewSheet.getDataRange().getValues();

  // Already written?
  if (data.some(row => row[0] === summaryLabel)) return;

  // Count individual (non-summary) submissions for this kid + week
  const weekRows = data.filter(row => row[0] === kid && Number(row[1]) === Number(week));
  if (weekRows.length < 7) return;  // Not all 7 days submitted yet

  let totalScore = 0, totalMax = 0;
  weekRows.forEach(row => { totalScore += Number(row[6]) || 0; totalMax += Number(row[7]) || 0; });
  const avgPct   = Math.round((totalScore / totalMax) * 100);
  const status   = avgPct >= 75 ? '✅' : avgPct >= 50 ? '⚠️' : '❌';
  const color    = KID_COLORS[kid] || { accent: '#888888' };

  // Overview summary row (inserted at top so it appears above the week's individual rows)
  overviewSheet.insertRowAfter(1);
  overviewSheet.getRange(2, 1, 1, OVERVIEW_COLS.length)
    .setValues([[summaryLabel, week, '—', 'WEEK TOTAL', 'All 7 subjects', '—',
                 totalScore.toFixed(1), totalMax, avgPct + '%', status]])
    .setBackground(color.accent)
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(10);

  // Kid tab summary row
  const kidSheet = ss.getSheetByName(kid);
  if (kidSheet) {
    kidSheet.insertRowAfter(1);
    kidSheet.getRange(2, 1, 1, KID_COLS.length)
      .setValues([[`📊 Week ${week} — All subjects`, '—', 'WEEK TOTAL', '—', '—',
                   '—', '—', '—', '—', '—', totalScore.toFixed(1), totalMax, avgPct + '%']])
      .setBackground(color.accent)
      .setFontColor('white')
      .setFontWeight('bold')
      .setFontSize(10);
  }
}

// ─── READ DATA ────────────────────────────────────────────────────────────────

function handleGetData(body) {
  const ssId = getProp('SPREADSHEET_ID');
  if (!ssId) return jsonOut({ error: 'SPREADSHEET_ID not set' });

  const ss   = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName('Overview');
  if (!sheet) return jsonOut({ rows: [] });

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOut({ rows: [] });

  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return jsonOut({ rows });
}

// ─── TOPIC HINT SETTINGS ─────────────────────────────────────────────────────

function handleGetSettings(body) {
  const ssId = getProp('SPREADSHEET_ID');
  if (!ssId) return jsonOut({ hint: '' });

  const { kid } = body;
  if (!kid) return jsonOut({ hint: '' });

  const ss    = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return jsonOut({ hint: '' });

  const data = sheet.getDataRange().getValues();
  const row  = data.find(r => r[0] === kid);
  return jsonOut({ hint: row ? (row[1] || '') : '' });
}

function handleSaveSettings(body) {
  const ssId = getProp('SPREADSHEET_ID');
  if (!ssId) return jsonOut({ error: 'SPREADSHEET_ID not set' });

  const { settings } = body;
  if (!settings) return jsonOut({ error: 'No settings provided' });

  const ss  = SpreadsheetApp.openById(ssId);
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.getRange(1, 1, 1, 3)
         .setValues([['Kid', 'TopicHint', 'UpdatedAt']])
         .setBackground('#1a1a2e')
         .setFontColor('white')
         .setFontWeight('bold');
  }

  const now  = new Date().toISOString();
  const kids = ['Fatima', 'Rayyan', 'Haniya'];
  kids.forEach(kid => {
    const hint = (settings[kid] || '').trim();
    const data = sheet.getDataRange().getValues();
    const idx  = data.findIndex((r, i) => i > 0 && r[0] === kid);
    if (idx >= 1) {
      sheet.getRange(idx + 1, 2, 1, 2).setValues([[hint, now]]);
    } else {
      sheet.appendRow([kid, hint, now]);
    }
  });

  return jsonOut({ ok: true });
}

// ─── READ KID QUESTION DATA ───────────────────────────────────────────────────

function handleGetKidData(body) {
  const ssId = getProp('SPREADSHEET_ID');
  if (!ssId) return jsonOut({ error: 'SPREADSHEET_ID not set' });

  const { kid, week, day } = body;
  if (!kid || !week || !day) return jsonOut({ error: 'Missing kid, week, or day' });

  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(kid);
  if (!sheet) return jsonOut({ rows: [] });

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOut({ rows: [] });

  const headers = data[0];
  const rows = data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    })
    .filter(r => Number(r.Week) === Number(week) && r.Day === day && Number(r['Q#']) > 0);

  return jsonOut({ rows });
}

// ─── FIX WEEK NUMBERS BASED ON ACTUAL DATES ──────────────────────────────────
// Run once from Apps Script editor (Run → fixWeekNumbersByDate).
// Calculates the correct week for every row from its actual date,
// using PROGRAM_START = May 4 2026. Safe to re-run.
function fixWeekNumbersByDate() {
  const ssId = getProp('SPREADSHEET_ID');
  if (!ssId) { Logger.log('SPREADSHEET_ID not set'); return; }
  const ss = SpreadsheetApp.openById(ssId);

  function correctWeek(dateVal) {
    if (!dateVal || dateVal === '—') return null;
    const d = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const start = new Date(2026, 4, 4); // May 4 2026
    const diffDays = Math.floor((local - start) / 86400000);
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }

  // Overview: Kid=A(0), Week=B(1), Date=C(2)
  const ov = ss.getSheetByName('Overview');
  if (ov) {
    const data = ov.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const wk = correctWeek(data[i][2]); // col C = Date; null for summary rows (date="—")
      if (wk !== null) ov.getRange(i + 1, 2).setValue(wk);
    }
    Logger.log('Overview fixed');
  }

  // Per-kid sheets: Week=A(0), Date=B(1)
  // Summary rows have date="—" so correctWeek returns null and col A label is preserved.
  ['Fatima', 'Rayyan', 'Haniya'].forEach(kid => {
    const sheet = ss.getSheetByName(kid);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const wk = correctWeek(data[i][1]); // col B = Date
      if (wk !== null) sheet.getRange(i + 1, 1).setValue(wk);
    }
    Logger.log(kid + ' fixed');
  });

  Logger.log('Date-based week fix complete');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
