// /api/admin/rsvps — GET list of RSVPs (newest first).
//   ?event_id=<id>   filter to one event
//   ?format=csv      download as CSV instead of JSON
import { json, rsvpToAdmin } from '../../_shared/db.js';

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get('event_id');
  const format = url.searchParams.get('format');

  const stmt = eventId
    ? env.DB.prepare(
        'SELECT * FROM rsvps WHERE event_id = ? ORDER BY created_at DESC, id DESC'
      ).bind(eventId)
    : env.DB.prepare('SELECT * FROM rsvps ORDER BY created_at DESC, id DESC');

  const { results } = await stmt.all();
  const rows = (results || []).map(rsvpToAdmin);

  if (format === 'csv') {
    const header = ['created_at', 'event_id', 'name', 'email', 'guests', 'note', 'synced_sheet'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [r.createdAt, r.eventId, r.name, r.email, r.guests, r.note, r.syncedSheet]
          .map(csvCell)
          .join(',')
      );
    }
    return new Response(lines.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="rsvps.csv"',
        'cache-control': 'no-store',
      },
    });
  }

  return json(rows);
}
