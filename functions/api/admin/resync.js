// POST /api/admin/resync — replay rows that never reached their Google Sheet.
// Body: { type: 'rsvps' | 'subscribers' }
//
// Rows are written to D1 first and mirrored to Sheets second, on purpose: a
// Sheet outage must never cost us an RSVP. The cost of that choice is that a
// row written while the Apps Script was misconfigured (bad token, wrong URL,
// access not yet "Anyone") stays at synced_sheet = 0 forever, because nothing
// retries automatically. This is that retry, run on demand.
//
// Batched deliberately. Each row is one subrequest to Apps Script and those are
// slow (~1s), so a long backlog would hit the Worker's subrequest ceiling and
// time out mid-run. We do BATCH at a time and report what is left, so the admin
// can press the button again rather than watch a request die.
import { json } from '../../_shared/db.js';
import { postToAppsScript } from '../../_shared/integrations.js';

const BATCH = 25;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const type = body.type === 'subscribers' ? 'subscribers' : body.type === 'rsvps' ? 'rsvps' : null;
  if (!type) return json({ ok: false, error: 'bad_type' }, 400);

  const url = type === 'rsvps' ? env.APPS_SCRIPT_URL : env.APPS_SCRIPT_NEWSLETTER_URL;
  if (!url) return json({ ok: false, error: 'no_sheet_configured', type }, 400);

  const total = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ${type} WHERE synced_sheet = 0`
  ).first();
  const pending = total ? total.n : 0;
  if (!pending) return json({ ok: true, attempted: 0, synced: 0, failed: 0, remaining: 0 });

  const { results } = await env.DB.prepare(
    `SELECT * FROM ${type} WHERE synced_sheet = 0 ORDER BY id ASC LIMIT ?`
  ).bind(BATCH).all();

  const origin = new URL(request.url).origin;
  let synced = 0;
  const errors = [];

  for (const r of results || []) {
    const payload = type === 'rsvps'
      ? {
          event_id: r.event_id || '',
          first_name: r.first_name || '',
          last_name: r.last_name || '',
          name: r.name || '',
          email: r.email || '',
          guests: r.guests || 1,
          note: r.note || '',
        }
      : {
          action: 'subscribe',
          first_name: r.first_name || '',
          last_name: r.last_name || '',
          email: r.email,
          // Carry the row's REAL state, so replaying an opted-out subscriber
          // doesn't quietly resurrect them as Subscribed in the sheet.
          status: r.status === 'unsubscribed' ? 'Unsubscribed' : 'Subscribed',
          source: r.source || '',
          unsubscribe_url: `${origin}/unsubscribe?t=${r.token}`,
        };

    const res = await postToAppsScript(url, payload, env.APPS_SCRIPT_TOKEN);
    if (res.synced) {
      await env.DB.prepare(`UPDATE ${type} SET synced_sheet = 1 WHERE id = ?`).bind(r.id).run();
      synced++;
    } else {
      errors.push({ id: r.id, reason: res.reason, error: res.error || res.snippet || '' });
    }
  }

  const attempted = (results || []).length;
  return json({
    ok: true,
    type,
    attempted,
    synced,
    failed: attempted - synced,
    remaining: Math.max(0, pending - synced),
    // Only the first few — enough to diagnose without flooding the response.
    errors: errors.slice(0, 3),
  });
}
