// POST /api/rsvp — public. Flow:
//   1. Verify the Cloudflare Turnstile token (skipped if no secret configured,
//      e.g. local dev).
//   2. Insert the RSVP into D1.
//   3. Mirror the row to the Google Sheet via the Apps Script web app.
//      Sheet failures do NOT fail the request (the row is safe in D1).
import { json } from '../_shared/db.js';

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return { ok: true, reason: 'skipped' };
  if (!token) return { ok: false, reason: 'no_token' };
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: form }
    );
    const out = await res.json();
    if (out.success) return { ok: true, reason: 'verified' };
    return { ok: false, reason: 'siteverify_failed', codes: out['error-codes'] || [] };
  } catch (e) {
    return { ok: false, reason: 'siteverify_error' };
  }
}

async function mirrorToSheet(env, payload) {
  if (!env.APPS_SCRIPT_URL) return false;
  try {
    const res = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, token: env.APPS_SCRIPT_TOKEN || '' }),
    });
    if (!res.ok) return false;
    const out = await res.json().catch(() => ({}));
    return out.ok !== false;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const name = String(body.name || '').trim();
  if (!name) return json({ ok: false, error: 'name_required' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ts = await verifyTurnstile(env, body.turnstileToken, ip);
  if (!ts.ok) {
    return json({ ok: false, error: 'turnstile_failed', reason: ts.reason, codes: ts.codes }, 403);
  }

  const rsvp = {
    event_id: String(body.eventId || body.event_id || '').trim(),
    name,
    email: String(body.email || '').trim(),
    guests: Number.isFinite(+body.guests) ? Math.max(1, Math.trunc(+body.guests)) : 1,
    note: String(body.note || '').trim(),
  };

  const inserted = await env.DB.prepare(
    'INSERT INTO rsvps (event_id, name, email, guests, note) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(rsvp.event_id, rsvp.name, rsvp.email, rsvp.guests, rsvp.note)
    .run();
  const rowId = inserted.meta && inserted.meta.last_row_id;

  const synced = await mirrorToSheet(env, {
    event_id: rsvp.event_id,
    name: rsvp.name,
    email: rsvp.email,
    guests: rsvp.guests,
    note: rsvp.note,
  });
  if (synced && rowId) {
    await env.DB.prepare('UPDATE rsvps SET synced_sheet = 1 WHERE id = ?')
      .bind(rowId)
      .run();
  }

  return json({ ok: true });
}
