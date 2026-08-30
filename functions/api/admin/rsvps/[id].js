// DELETE /api/admin/rsvps/:id — remove one RSVP.
//
// D1 only. The RSVP sheet is an append-only log with no stable key per row
// (the same person can RSVP to several gatherings, and nothing in the sheet
// identifies which row came from which record), so guessing a row to delete
// there risks deleting the wrong one. The admin UI says so before confirming.
import { json } from '../../../_shared/db.js';

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  const row = await env.DB.prepare('SELECT id FROM rsvps WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  await env.DB.prepare('DELETE FROM rsvps WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
