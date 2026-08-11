// /api/admin/events — GET (list all, incl. inactive/ordering) + POST (create).
import { json, eventToAdmin, eventFromBody } from '../../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM events ORDER BY sort_order ASC, rowid ASC'
  ).all();
  return json((results || []).map(eventToAdmin));
}

export async function onRequestPost({ request, env }) {
  let e;
  try {
    e = eventFromBody(await request.json());
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!e.id) return json({ ok: false, error: 'id_required' }, 400);
  if (!e.title) return json({ ok: false, error: 'title_required' }, 400);

  const exists = await env.DB.prepare('SELECT id FROM events WHERE id = ?')
    .bind(e.id)
    .first();
  if (exists) return json({ ok: false, error: 'duplicate_id' }, 409);

  // Append to the end by default if no explicit sort_order was given.
  if (!e.sort_order) {
    const row = await env.DB.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM events'
    ).first();
    e.sort_order = row.n;
  }

  await env.DB.prepare(
    `INSERT INTO events
       (id, title, date, time, place, category, tone, price,
        stripe_url, facebook_url, blurb, detail, note, sort_order, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))`
  )
    .bind(
      e.id, e.title, e.date, e.time, e.place, e.category, e.tone, e.price,
      e.stripe_url, e.facebook_url, e.blurb, e.detail, e.note, e.sort_order
    )
    .run();

  return json({ ok: true, id: e.id }, 201);
}
