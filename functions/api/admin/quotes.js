// /api/admin/quotes — GET (list all, incl. inactive) + POST (create).
import { json, quoteToAdmin, quoteFromBody } from '../../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM quotes ORDER BY sort_order ASC, id ASC'
  ).all();
  return json((results || []).map(quoteToAdmin));
}

export async function onRequestPost({ request, env }) {
  let q;
  try {
    q = quoteFromBody(await request.json());
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!q.name) return json({ ok: false, error: 'name_required' }, 400);
  if (!q.body) return json({ ok: false, error: 'body_required' }, 400);

  if (!q.sort_order) {
    const row = await env.DB.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM quotes'
    ).first();
    q.sort_order = row.n;
  }

  const res = await env.DB.prepare(
    `INSERT INTO quotes (name, detail, tone, body, monogram, avatar, active, sort_order, updated_at)
     VALUES (?,?,?,?,?,?,?,?, datetime('now'))`
  )
    .bind(q.name, q.detail, q.tone, q.body, q.monogram, q.avatar, q.active, q.sort_order)
    .run();

  return json({ ok: true, id: res.meta && res.meta.last_row_id }, 201);
}
