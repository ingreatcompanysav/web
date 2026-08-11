// /api/admin/quotes/:id — PUT (update) + DELETE.
import { json, quoteFromBody } from '../../../_shared/db.js';

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  let q;
  try {
    q = quoteFromBody(await request.json());
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!q.name) return json({ ok: false, error: 'name_required' }, 400);
  if (!q.body) return json({ ok: false, error: 'body_required' }, 400);

  const exists = await env.DB.prepare('SELECT id FROM quotes WHERE id = ?')
    .bind(id)
    .first();
  if (!exists) return json({ ok: false, error: 'not_found' }, 404);

  await env.DB.prepare(
    `UPDATE quotes SET
       name = ?, detail = ?, tone = ?, body = ?, monogram = ?,
       active = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(q.name, q.detail, q.tone, q.body, q.monogram, q.active, q.sort_order, id)
    .run();

  return json({ ok: true, id });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM quotes WHERE id = ?')
    .bind(Number(params.id))
    .run();
  return json({ ok: true });
}
