// POST /api/admin/reorder — batch-update sort order.
// Body: { type: 'events' | 'quotes', order: [id, id, ...] }
// The array position becomes the new sort_order.
import { json } from '../../_shared/db.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const table = body.type === 'quotes' ? 'quotes' : body.type === 'events' ? 'events' : null;
  if (!table) return json({ ok: false, error: 'bad_type' }, 400);
  if (!Array.isArray(body.order)) return json({ ok: false, error: 'order_required' }, 400);

  const stmts = body.order.map((id, i) =>
    env.DB.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).bind(
      i,
      table === 'quotes' ? Number(id) : id
    )
  );
  if (stmts.length) await env.DB.batch(stmts);

  return json({ ok: true });
}
