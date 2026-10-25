// POST /api/reminders-due — called hourly by the Apps Script in
// apps-script/survey.gs. Not under /api/admin because Cloudflare Access would
// turn the script away; the shared APPS_SCRIPT_TOKEN guards it instead.
//
//   { token, action: 'due' }               -> { ok, reminders: [{eventId, email, firstName, eventTitle, when, place, url}] }
//   { token, action: 'failed', reminders } -> hands those back ([{eventId, email}]) so a re-run can retry them
//
// The rules:
//   * Only gatherings with "Email a reminder" ticked, not hidden, with a real
//     date, that start within the next 24 hours. The script runs hourly, so a
//     reminder lands 23–24 hours ahead. A gathering with no readable time is
//     treated as starting at 9am.
//   * At most one reminder per person per gathering. 'due' claims each person
//     by inserting their reminders row in the same statement that returns it;
//     the UNIQUE(event_id, email) index turns a second claim into a no-op, so
//     a re-run or a double trigger can't email anyone twice.
//   * Anyone who RSVP'd inside the 24 hours is skipped: they've only just had
//     their confirmation.
import { json, easternIso } from '../_shared/db.js';

const DAY = 86400e3;

// Hours east of UTC in Savannah at `ms` — -4 in summer, -5 in winter.
function easternOffset(ms) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' })
    .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName').value;   // "GMT-4"
  return Number((/GMT([+-]\d+)/.exec(name) || [0, -5])[1]);
}

// event_date + the display time ("6:30pm") -> the start as a UTC timestamp.
function startOf(e) {
  const [y, mo, d] = e.event_date.split('-').map(Number);
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/i.exec(e.time || '');
  const h = m ? (+m[1] % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0) : 9;
  const local = Date.UTC(y, mo - 1, d, h, m ? +(m[2] || 0) : 0);
  return local - easternOffset(local) * 3600e3;
}

// The format SQLite's datetime('now') writes, for comparing with created_at.
const sqlTime = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);

export async function onRequestPost({ request, env }) {
  if (!env.APPS_SCRIPT_TOKEN) return json({ ok: false, error: 'not_configured' }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (body.token !== env.APPS_SCRIPT_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);

  if (body.action === 'failed') {
    const list = Array.isArray(body.reminders) ? body.reminders : [];
    const stmts = list.map((r) =>
      env.DB.prepare('DELETE FROM reminders WHERE event_id = ? AND email = ?')
        .bind(String(r.eventId || ''), String(r.email || ''))
    );
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true });
  }
  if (body.action !== 'due') return json({ ok: false, error: 'bad_action' }, 400);

  // Today through the day after tomorrow covers every possible 24h window.
  const { results: events } = await env.DB.prepare(
    `SELECT id, title, date, time, place, event_date FROM events
      WHERE remind_auto = 1 AND hidden = 0 AND event_date BETWEEN ? AND ?`
  ).bind(easternIso(0), easternIso(-2)).all();

  const now = Date.now();
  const origin = new URL(request.url).origin;
  const out = [];
  for (const e of events || []) {
    const start = startOf(e);
    if (start <= now || start - now > DAY) continue;

    // One per distinct address; emails are already lowercased on RSVP.
    const { results: people } = await env.DB.prepare(
      `SELECT email, MIN(first_name) AS first_name FROM rsvps
        WHERE event_id = ? AND email != '' AND created_at < ?
        GROUP BY email`
    ).bind(e.id, sqlTime(start - DAY)).all();
    if (!people || !people.length) continue;

    const claims = await env.DB.batch(people.map((p) =>
      env.DB.prepare('INSERT OR IGNORE INTO reminders (event_id, email) VALUES (?, ?) RETURNING email')
        .bind(e.id, p.email)
    ));
    claims.forEach((res, i) => {
      if (!res.results || !res.results.length) return;   // already reminded
      out.push({
        eventId: e.id,
        email: people[i].email,
        firstName: people[i].first_name || '',
        eventTitle: e.title,
        when: [e.date, e.time].filter(Boolean).join(' at '),
        place: e.place || '',
        url: `${origin}/#event/${encodeURIComponent(e.id)}`,
      });
    });
  }
  return json({ ok: true, reminders: out });
}
