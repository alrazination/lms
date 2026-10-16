// All requests are "simple" CORS requests (GET, or POST as text/plain)
// so the browser never sends a preflight that Apps Script can't answer.
async function apiGet(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  const out = await res.json();
  if (!out.ok) throw new Error(out.error || 'Request failed');
  return out.data;
}

async function apiPost(body, extra = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    ...extra
  });
  const out = await res.json();
  if (!out.ok) throw new Error(out.error || 'Request failed');
  return out;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('lms_user') || 'null'); } catch (e) { return null; }
}
