// /api/admin/links — GET (list all, incl. hidden) + POST (create).
import { json, linkToAdmin, linkFromBody } from '../../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM links ORDER BY sort_order ASC, id ASC'
  ).all();
  return json((results || []).map(linkToAdmin));
}

export async function onRequestPost({ request, env }) {
  let l;
  try {
    l = linkFromBody(await request.json());
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!l.label) return json({ ok: false, error: 'label_required' }, 400);
  if (!l.url) return json({ ok: false, error: 'url_required' }, 400);

  if (!l.sort_order) {
    const row = await env.DB.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM links'
    ).first();
    l.sort_order = row.n;
  }

  const res = await env.DB.prepare(
    `INSERT INTO links (label, url, subtitle, icon, tone, active, sort_order, updated_at)
     VALUES (?,?,?,?,?,?,?, datetime('now'))`
  )
    .bind(l.label, l.url, l.subtitle, l.icon, l.tone, l.active, l.sort_order)
    .run();

  return json({ ok: true, id: res.meta && res.meta.last_row_id }, 201);
}
