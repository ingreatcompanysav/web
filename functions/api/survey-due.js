// POST /api/survey-due — called by the survey Apps Script (apps-script/survey.gs)
// from its daily 9am trigger. Not under /api/admin because Cloudflare Access
// would turn the script away; the shared APPS_SCRIPT_TOKEN guards it instead.
//
//   { token, action: 'due' }             -> { ok, surveys: [{token, email, firstName, eventTitle, url}] }
//   { token, action: 'failed', tokens }  -> hands those back so a re-run can retry them
//
// Two rules the client asked for, and where each is held:
//   * Only gatherings dated YESTERDAY. Anything older is more than a day gone
//     and never sends, even if its box is still ticked.
//   * At most one survey per person per gathering. The UNIQUE(event_id, email)
//     index means a person has one row however many times they RSVP'd, and
//     'due' claims each row by stamping sent_at in the same statement that
//     returns it — a row with sent_at is never handed out again, so a re-run,
//     a double trigger or a retry can't email anyone twice.
import { json, newToken, easternIso } from '../_shared/db.js';

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
    const tokens = Array.isArray(body.tokens) ? body.tokens.map(String) : [];
    const stmts = tokens.map((t) =>
      env.DB.prepare('UPDATE surveys SET sent_at = NULL WHERE token = ? AND answered_at IS NULL').bind(t)
    );
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true });
  }
  if (body.action !== 'due') return json({ ok: false, error: 'bad_action' }, 400);

  const yesterday = easternIso(1);
  const { results: events } = await env.DB.prepare(
    'SELECT id, title FROM events WHERE survey_auto = 1 AND hidden = 0 AND event_date = ?'
  ).bind(yesterday).all();

  const origin = new URL(request.url).origin;
  const out = [];
  for (const e of events || []) {
    // One row per distinct address; emails are already lowercased on RSVP.
    const { results: people } = await env.DB.prepare(
      `SELECT email, MIN(first_name) AS first_name FROM rsvps
        WHERE event_id = ? AND email != '' GROUP BY email`
    ).bind(e.id).all();
    const inserts = (people || []).map((p) =>
      env.DB.prepare(
        'INSERT OR IGNORE INTO surveys (event_id, email, first_name, token) VALUES (?, ?, ?, ?)'
      ).bind(e.id, p.email, p.first_name || '', newToken())
    );
    if (inserts.length) await env.DB.batch(inserts);

    const { results: claimed } = await env.DB.prepare(
      `UPDATE surveys SET sent_at = datetime('now')
        WHERE event_id = ? AND sent_at IS NULL AND answered_at IS NULL
        RETURNING token, email, first_name`
    ).bind(e.id).all();
    for (const s of claimed || []) {
      out.push({
        token: s.token,
        email: s.email,
        firstName: s.first_name || '',
        eventTitle: e.title,
        url: `${origin}/survey?t=${s.token}`,
      });
    }
  }
  return json({ ok: true, date: yesterday, surveys: out });
}
