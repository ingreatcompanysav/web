// /api/admin/events/:id — PUT (update) + DELETE.
import { json, eventFromBody } from '../../../_shared/db.js';

export async function onRequestPut({ request, env, params }) {
  const id = params.id;
  let e;
  try {
    e = eventFromBody({ ...(await request.json()), id });
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!e.title) return json({ ok: false, error: 'title_required' }, 400);

  const exists = await env.DB.prepare('SELECT id FROM events WHERE id = ?')
    .bind(id)
    .first();
  if (!exists) return json({ ok: false, error: 'not_found' }, 404);

  await env.DB.prepare(
    `UPDATE events SET
       title = ?, date = ?, time = ?, place = ?, category = ?, tone = ?,
       price = ?, stripe_url = ?, facebook_url = ?, blurb = ?, detail = ?,
       note = ?, image = ?, status = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      e.title, e.date, e.time, e.place, e.category, e.tone, e.price,
      e.stripe_url, e.facebook_url, e.blurb, e.detail, e.note, e.image, e.status, e.sort_order, id
    )
    .run();

  return json({ ok: true, id });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
