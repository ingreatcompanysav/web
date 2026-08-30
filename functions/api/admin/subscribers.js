// GET /api/admin/subscribers — the newsletter list, newest first.
// Read-only: signups come from the public form and opt-outs from /unsubscribe,
// so there is nothing here for the admin to edit.
import { json, subscriberToAdmin } from '../../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM subscribers ORDER BY id DESC'
  ).all();
  return json((results || []).map(subscriberToAdmin));
}
