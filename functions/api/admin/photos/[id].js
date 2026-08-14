// /api/admin/photos/:id — PUT (edit metadata: slot, alt, active, sortOrder)
// + DELETE (removes the R2 object and the row). The image bytes are immutable;
// to change the picture, delete and re-upload.
import { json, PHOTO_SLOTS } from '../../../_shared/db.js';

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400); }

  const row = await env.DB.prepare('SELECT id FROM photos WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  const sets = [], binds = [];
  if (PHOTO_SLOTS.includes(b.slot)) { sets.push('slot = ?'); binds.push(b.slot); }
  if (b.alt != null) { sets.push('alt = ?'); binds.push(String(b.alt).slice(0, 300)); }
  if (b.active === 0 || b.active === false) { sets.push('active = ?'); binds.push(0); }
  else if (b.active === 1 || b.active === true) { sets.push('active = ?'); binds.push(1); }
  if (Number.isFinite(+b.sortOrder)) { sets.push('sort_order = ?'); binds.push(Math.trunc(+b.sortOrder)); }

  if (!sets.length) return json({ ok: true, id });
  binds.push(id);
  await env.DB.prepare(`UPDATE photos SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ ok: true, id });
}

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  const row = await env.DB.prepare('SELECT r2_key FROM photos WHERE id = ?').bind(id).first();
  if (row && row.r2_key) { try { await env.PHOTOS.delete(row.r2_key); } catch {} }
  await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
