// GET /api/events — public. Returns the same JSON array shape the site used to
// fetch from events.json, so the bundle override is a drop-in replacement.
import { json, eventToPublic } from '../_shared/db.js';

export async function onRequestGet({ env }) {
  // Everything except hidden (draft/cancelled). A dated event counts as past
  // once its day is over — 'now' is shifted −5h so the rollover lands around
  // midnight in Savannah (Eastern), not mid-evening UTC. Undated events
  // (event_date = '') are never past. Past events are still returned; the site
  // buckets them into its "Past gatherings" section.
  const { results } = await env.DB.prepare(
    `SELECT *,
       (event_date != '' AND event_date < date('now','-5 hours')) AS is_past
     FROM events
     WHERE hidden = 0
     ORDER BY sort_order ASC, rowid ASC`
  ).all();
  return json((results || []).map(eventToPublic));
}
