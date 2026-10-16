/**
 * Serverless SCORM LMS backend – Google Apps Script web app.
 * Bound to a Google Sheet with tabs: Users, Courses, Tracking
 * (missing tabs/headers are created automatically on first request).
 *
 * CORS NOTE: Apps Script web apps cannot set custom response headers.
 * They do answer cross-origin fetch() calls as long as the request is a
 * "simple request": GET, or POST with Content-Type: text/plain (no preflight).
 * The frontend (js/api.js) is written that way, so no extra CORS code is needed.
 */

// >>> CHANGE THIS to a long random string. Admin page asks for it. <<<
const ADMIN_KEY = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';

const HEADERS = {
  Users:    ['UserID', 'Name', 'FirstSeen', 'LastSeen'],
  Courses:  ['CourseID', 'Name', 'FolderPath', 'LaunchFile', 'Created'],
  Tracking: ['UserID', 'CourseID', 'Status', 'Score', 'SessionTime', 'TotalTime',
             'Location', 'SuspendData', 'FirstAccess', 'LastUpdated']
};

/* ---------- Entry points ---------- */

function doGet(e) {
  try {
    const p = e.parameter || {};
    switch (p.action) {
      case 'courses':    return json_({ ok: true, data: readAll_('Courses') });
      case 'myTracking': return json_({ ok: true, data: myTracking_(p.userId, p.courseId) });
      default:           return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'track':         return json_(withLock_(() => track_(body)));
      case 'addCourse':     requireAdmin_(body); return json_(withLock_(() => addCourse_(body)));
      case 'deleteCourse':  requireAdmin_(body); return json_(withLock_(() => deleteCourse_(body)));
      case 'adminTracking': requireAdmin_(body); return json_({ ok: true, data: adminTracking_() });
      default:              return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ---------- Handlers ---------- */

function track_(d) {
  const userId = str_(d.userId, 64), courseId = str_(d.courseId, 64);
  if (!userId || !courseId) throw new Error('userId and courseId are required');
  if (!readAll_('Courses').some(c => c.CourseID === courseId)) throw new Error('Unknown course');

  const now = new Date();
  const name = str_(d.userName, 120);

  // Users upsert
  const users = getSheet_('Users');
  const uRow = findRow_(users, [userId]);
  if (uRow) {
    users.getRange(uRow, 2, 1, 3).setValues([[name || users.getRange(uRow, 2).getValue(),
                                              users.getRange(uRow, 3).getValue(), now]]);
  } else {
    users.appendRow([userId, name, now, now]);
  }

  // Tracking upsert
  const sh = getSheet_('Tracking');
  const score = (d.score === '' || d.score == null || isNaN(Number(d.score))) ? '' : Number(d.score);
  const row = findRow_(sh, [userId, courseId]);
  if (row) {
    const first = sh.getRange(row, 9).getValue();
    sh.getRange(row, 3, 1, 8).setValues([[
      str_(d.status, 32), score, str_(d.sessionTime, 32), str_(d.totalTime, 32),
      str_(d.location, 255), str_(d.suspendData, 20000), first, now
    ]]);
  } else {
    sh.appendRow([userId, courseId, str_(d.status, 32), score, str_(d.sessionTime, 32),
                  str_(d.totalTime, 32), str_(d.location, 255), str_(d.suspendData, 20000), now, now]);
  }
  return { ok: true };
}

function addCourse_(d) {
  const name = str_(d.name, 160);
  const folder = str_(d.folderPath, 255).replace(/^\/+|\/+$/g, '');
  const launch = str_(d.launchFile, 120).replace(/^\/+/, '') || 'index.html';
  if (!name || !folder) throw new Error('Name and folder path are required');
  if (/\.\./.test(folder) || /\.\./.test(launch)) throw new Error('Invalid path');
  const id = 'c' + Utilities.getUuid().slice(0, 8);
  getSheet_('Courses').appendRow([id, name, folder, launch, new Date()]);
  return { ok: true, courseId: id };
}

function deleteCourse_(d) {
  const sh = getSheet_('Courses');
  const row = findRow_(sh, [str_(d.courseId, 64)]);
  if (!row) throw new Error('Course not found');
  sh.deleteRow(row);
  return { ok: true };
}

function myTracking_(userId, courseId) {
  userId = str_(userId, 64);
  if (!userId) return [];
  return readAll_('Tracking').filter(r =>
    String(r.UserID) === userId && (!courseId || String(r.CourseID) === courseId));
}

function adminTracking_() {
  const courses = {}, users = {};
  readAll_('Courses').forEach(c => courses[c.CourseID] = c.Name);
  readAll_('Users').forEach(u => users[u.UserID] = u.Name);
  return readAll_('Tracking').map(t => ({
    UserID: t.UserID,
    Name: users[t.UserID] || '',
    CourseID: t.CourseID,
    Course: courses[t.CourseID] || '(deleted course)',
    Status: t.Status, Score: t.Score,
    SessionTime: t.SessionTime, TotalTime: t.TotalTime,
    FirstAccess: t.FirstAccess, LastUpdated: t.LastUpdated
  }));
}

/* ---------- Helpers ---------- */

function requireAdmin_(body) {
  if (!body.adminKey || body.adminKey !== ADMIN_KEY) throw new Error('Invalid admin key');
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS[name]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readAll_(name) {
  const values = getSheet_(name).getDataRange().getValues();
  const head = values.shift();
  return values.filter(r => r[0] !== '').map(r => {
    const o = {};
    head.forEach((h, i) => o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]);
    return o;
  });
}

// Row number (1-based) whose first N columns match keys, or 0.
function findRow_(sh, keys) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const vals = sh.getRange(2, 1, last - 1, keys.length).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (keys.every((k, j) => String(vals[i][j]) === String(k))) return i + 2;
  }
  return 0;
}

// Trim, cap length, and neutralise spreadsheet-formula injection.
function str_(v, max) {
  let s = (v == null ? '' : String(v)).trim().slice(0, max || 255);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
