// GET /api/admin/surveys — every survey row (sent and answered), newest first.
// The admin's Survey tab groups them by gathering and builds the CSV itself.
import { json } from '../../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM surveys ORDER BY answered_at DESC, id DESC'
  ).all();
  return json((results || []).map((r) => ({
    id: r.id,
    eventId: r.event_id,
    email: r.email,
    firstName: r.first_name || '',
    sentAt: r.sent_at || '',
    answeredAt: r.answered_at || '',
    answers: r.answers ? JSON.parse(r.answers) : [],
  })));
}
