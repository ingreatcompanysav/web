// /api/admin/subscribers/:id — the admin's manual controls over one subscriber.
//
//   PUT    { status: 'subscribed' | 'unsubscribed' }
//          The safety net for when the token link fails someone, and the tool
//          for taking an address off the list by hand. Keeps the row, so the
//          suppression record survives a later re-import.
//
//   DELETE Hard removal, for junk/spam signups that should leave no trace.
//          Note this also drops the suppression record — that address could
//          sign up again. Prefer PUT-to-unsubscribed for a real person.
import { json } from '../../../_shared/db.js';
import { postToAppsScript } from '../../../_shared/integrations.js';

const STATUSES = ['subscribed', 'unsubscribed'];

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const status = String(body.status || '');
  if (!STATUSES.includes(status)) return json({ ok: false, error: 'bad_status' }, 400);

  const row = await env.DB.prepare('SELECT id, email FROM subscribers WHERE id = ?')
    .bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  await env.DB.prepare(
    `UPDATE subscribers
       SET status = ?,
           unsubscribed_at = CASE WHEN ? = 'unsubscribed' THEN datetime('now') ELSE '' END,
           updated_at = datetime('now')
     WHERE id = ?`
  ).bind(status, status, id).run();

  // Keep the client's Sheet in step with what they just did in the admin.
  const sheet = await postToAppsScript(
    env.APPS_SCRIPT_NEWSLETTER_URL,
    {
      action: status === 'unsubscribed' ? 'unsubscribe' : 'subscribe',
      email: row.email,
      status: status === 'unsubscribed' ? 'Unsubscribed' : 'Subscribed',
    },
    env.APPS_SCRIPT_TOKEN
  );

  return json({ ok: true, id, status, sheetSynced: sheet.synced });
}

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  const row = await env.DB.prepare('SELECT email FROM subscribers WHERE id = ?')
    .bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  await env.DB.prepare('DELETE FROM subscribers WHERE id = ?').bind(id).run();

  const sheet = await postToAppsScript(
    env.APPS_SCRIPT_NEWSLETTER_URL,
    { action: 'unsubscribe', email: row.email, status: 'Removed' },
    env.APPS_SCRIPT_TOKEN
  );

  return json({ ok: true, sheetSynced: sheet.synced });
}
