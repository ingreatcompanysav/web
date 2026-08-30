// POST /api/rsvp — public. Flow:
//   1. Verify the Cloudflare Turnstile token (skipped if no secret configured,
//      e.g. local dev).
//   2. Insert the RSVP into D1.
//   3. Mirror the row to the Google Sheet via the Apps Script web app.
//      Sheet failures do NOT fail the request (the row is safe in D1).
import { json } from '../_shared/db.js';
import { verifyTurnstile, postToAppsScript } from '../_shared/integrations.js';

// Mirrors one RSVP into the RSVP sheet. Failures are non-fatal by design.
const mirrorToSheet = (env, payload) =>
  postToAppsScript(env.APPS_SCRIPT_URL, payload, env.APPS_SCRIPT_TOKEN);

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  if (!firstName) return json({ ok: false, error: 'name_required' }, 400);

  // `name` stays the combined value the Sheet's Name column and the CSV use.
  const name = [firstName, lastName].filter(Boolean).join(' ');

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ts = await verifyTurnstile(env, body.turnstileToken, ip);
  if (!ts.ok) return json({ ok: false, error: 'turnstile_failed' }, 403);

  const rsvp = {
    event_id: String(body.eventId || body.event_id || '').trim(),
    first_name: firstName,
    last_name: lastName,
    name,
    email: String(body.email || '').trim(),
    guests: Number.isFinite(+body.guests) ? Math.max(1, Math.trunc(+body.guests)) : 1,
    note: String(body.note || '').trim(),
  };

  const inserted = await env.DB.prepare(
    `INSERT INTO rsvps (event_id, first_name, last_name, name, email, guests, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(rsvp.event_id, rsvp.first_name, rsvp.last_name, rsvp.name, rsvp.email, rsvp.guests, rsvp.note)
    .run();
  const rowId = inserted.meta && inserted.meta.last_row_id;

  const sheet = await mirrorToSheet(env, {
    event_id: rsvp.event_id,
    first_name: rsvp.first_name,
    last_name: rsvp.last_name,
    name: rsvp.name,
    email: rsvp.email,
    guests: rsvp.guests,
    note: rsvp.note,
  });
  if (sheet.synced && rowId) {
    await env.DB.prepare('UPDATE rsvps SET synced_sheet = 1 WHERE id = ?')
      .bind(rowId)
      .run();
  }

  return json({ ok: true });
}
