// GET /api/events — public. Returns the same JSON array shape the site used to
// fetch from events.json, so the bundle override is a drop-in replacement.
import { json, eventToPublic } from '../_shared/db.js';

export async function onRequestGet({ env }) {
  // Everything except hidden (draft/cancelled). Past events are returned too —
  // the site buckets them into its "Past gatherings" section.
  const { results } = await env.DB.prepare(
    "SELECT * FROM events WHERE status != 'hidden' ORDER BY sort_order ASC, rowid ASC"
  ).all();
  return json((results || []).map(eventToPublic));
}
