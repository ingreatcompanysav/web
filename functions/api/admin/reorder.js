// POST /api/admin/reorder — batch-update sort order.
// Body: { type: 'events' | 'quotes' | 'photos' | 'links' | 'questions', order: [id, id, ...] }
// The array position becomes the new sort_order. Every table but events uses
// numeric ids.
import { json } from '../../_shared/db.js';

// The admin's tab name -> its table. Only events uses text ids.
const TABLES = { events: 'events', quotes: 'quotes', photos: 'photos', links: 'links', questions: 'survey_questions' };

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const table = Object.hasOwn(TABLES, body.type) ? TABLES[body.type] : null;
  if (!table) return json({ ok: false, error: 'bad_type' }, 400);
  if (!Array.isArray(body.order)) return json({ ok: false, error: 'order_required' }, 400);

  const stmts = body.order.map((id, i) =>
    env.DB.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).bind(
      i,
      table === 'events' ? id : Number(id)
    )
  );
  if (stmts.length) await env.DB.batch(stmts);

  return json({ ok: true });
}
