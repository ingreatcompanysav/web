// /api/admin/links/:id — PUT (update) + DELETE.
import { json, linkFromBody } from '../../../_shared/db.js';

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  let l;
  try {
    l = linkFromBody(await request.json());
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!l.label) return json({ ok: false, error: 'label_required' }, 400);
  if (!l.url) return json({ ok: false, error: 'url_required' }, 400);

  const exists = await env.DB.prepare('SELECT id FROM links WHERE id = ?')
    .bind(id)
    .first();
  if (!exists) return json({ ok: false, error: 'not_found' }, 404);

  await env.DB.prepare(
    `UPDATE links SET
       label = ?, url = ?, subtitle = ?, icon = ?, tone = ?,
       active = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(l.label, l.url, l.subtitle, l.icon, l.tone, l.active, l.sort_order, id)
    .run();

  return json({ ok: true, id });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM links WHERE id = ?')
    .bind(Number(params.id))
    .run();
  return json({ ok: true });
}
