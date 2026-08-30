// POST /api/subscribe — public newsletter signup.
//   1. Verify Turnstile (skipped when no secret is configured, e.g. local dev).
//   2. Upsert into D1 by email — re-subscribing an address updates the existing
//      row rather than creating a duplicate, and revives an unsubscribed one.
//   3. Mirror to the newsletter Google Sheet. Sheet failures do NOT fail the
//      request; the subscriber is already safe in D1.
import { json, normalizeEmail, looksLikeEmail, newToken } from '../_shared/db.js';
import { verifyTurnstile, postToAppsScript } from '../_shared/integrations.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = normalizeEmail(body.email);
  const source = String(body.source || '').trim().slice(0, 32);

  if (!firstName) return json({ ok: false, error: 'first_name_required' }, 400);
  if (!email) return json({ ok: false, error: 'email_required' }, 400);
  if (!looksLikeEmail(email)) return json({ ok: false, error: 'email_invalid' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ts = await verifyTurnstile(env, body.turnstileToken, ip);
  if (!ts.ok) return json({ ok: false, error: 'turnstile_failed' }, 403);

  const existing = await env.DB.prepare(
    'SELECT id, token, status FROM subscribers WHERE email = ?'
  ).bind(email).first();

  let token;
  let alreadySubscribed = false;

  if (existing) {
    // Keep the original token so unsubscribe links already sitting in someone's
    // inbox keep working after they re-subscribe.
    token = existing.token;
    alreadySubscribed = existing.status === 'subscribed';
    await env.DB.prepare(
      `UPDATE subscribers
         SET first_name = ?, last_name = ?, status = 'subscribed',
             unsubscribed_at = '', updated_at = datetime('now')
       WHERE id = ?`
    ).bind(firstName, lastName, existing.id).run();
  } else {
    token = newToken();
    await env.DB.prepare(
      `INSERT INTO subscribers (first_name, last_name, email, token, source)
       VALUES (?,?,?,?,?)`
    ).bind(firstName, lastName, email, token, source).run();
  }

  // The Sheet needs the full link, not the bare token, so a mail merge can drop
  // it straight into an email. Origin comes from the request so this works on
  // production, previews and localhost without another env var.
  const origin = new URL(request.url).origin;
  const sheet = await postToAppsScript(
    env.APPS_SCRIPT_NEWSLETTER_URL,
    {
      action: 'subscribe',
      first_name: firstName,
      last_name: lastName,
      email,
      status: 'Subscribed',
      source,
      unsubscribe_url: `${origin}/unsubscribe?t=${token}`,
    },
    env.APPS_SCRIPT_TOKEN
  );

  if (sheet.synced) {
    await env.DB.prepare(
      'UPDATE subscribers SET synced_sheet = 1 WHERE email = ?'
    ).bind(email).run();
  }

  return json({ ok: true, alreadySubscribed });
}
