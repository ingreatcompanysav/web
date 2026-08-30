// /api/unsubscribe — public opt-out. Two ways in:
//   * token  — from the personal link in a newsletter. Unambiguous, no typing.
//   * email  — the fallback for someone who no longer has the email. Turnstile
//              guards it; it is knowingly self-asserted (anyone can type any
//              address), which is why the token path is the one we put in mail.
//
// GET is a LOOKUP ONLY and never changes anything: mail scanners and link
// prefetchers follow URLs in email, and a GET that unsubscribed on sight would
// silently drop people off the list. The actual opt-out requires a POST, which
// the /unsubscribe page sends when the person clicks the button.
import { json, normalizeEmail, looksLikeEmail } from '../_shared/db.js';
import { verifyTurnstile, postToAppsScript } from '../_shared/integrations.js';

// Who this link belongs to, so the page can say "unsubscribe you@example.com?"
// The address is masked — the token travels through inboxes and forwards, and
// it should not hand a stranger someone's full email.
export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('t') || '';
  if (!token) return json({ ok: false, error: 'token_required' }, 400);

  const row = await env.DB.prepare(
    'SELECT first_name, email, status FROM subscribers WHERE token = ?'
  ).bind(token).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  return json({
    ok: true,
    firstName: row.first_name,
    emailMasked: maskEmail(row.email),
    status: row.status,
  });
}

function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  if (!domain) return '';
  const head = user.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const token = String(body.token || '').trim();
  const email = normalizeEmail(body.email);

  let row;
  if (token) {
    row = await env.DB.prepare(
      'SELECT id, email, status FROM subscribers WHERE token = ?'
    ).bind(token).first();
  } else {
    // Only the typed-email path needs a challenge; a valid token is already
    // proof enough and shouldn't make someone solve a puzzle to leave.
    if (!email) return json({ ok: false, error: 'email_required' }, 400);
    if (!looksLikeEmail(email)) return json({ ok: false, error: 'email_invalid' }, 400);
    const ip = request.headers.get('cf-connecting-ip') || '';
    const ts = await verifyTurnstile(env, body.turnstileToken, ip);
    if (!ts.ok) return json({ ok: false, error: 'turnstile_failed' }, 403);
    row = await env.DB.prepare(
      'SELECT id, email, status FROM subscribers WHERE email = ?'
    ).bind(email).first();
  }

  // Same response whether or not the address was on the list: telling a stranger
  // "not found" would turn this into a way to test who is subscribed.
  if (!row) return json({ ok: true, done: true });

  if (row.status !== 'unsubscribed') {
    await env.DB.prepare(
      `UPDATE subscribers
         SET status = 'unsubscribed', unsubscribed_at = datetime('now'),
             updated_at = datetime('now')
       WHERE id = ?`
    ).bind(row.id).run();

    // Flip the Sheet row too, so the client's working copy matches. Keyed by
    // email; the script marks the row rather than deleting it.
    await postToAppsScript(
      env.APPS_SCRIPT_NEWSLETTER_URL,
      { action: 'unsubscribe', email: row.email, status: 'unsubscribed' },
      env.APPS_SCRIPT_TOKEN
    );
  }

  return json({ ok: true, done: true });
}
