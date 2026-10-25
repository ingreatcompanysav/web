// /api/admin/about — GET + PUT the Who we are page's intro text.
// Body: { intro }. The profile cards are /api/admin/team.
import { json } from '../../_shared/db.js';

const MAX = 10000;

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare("SELECT value FROM site_text WHERE key = 'about_intro'").first();
  return json({ intro: row ? row.value : '' });
}

export async function onRequestPut({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'invalid_json' }, 400);
  const intro = String(body.intro ?? '').trim().slice(0, MAX);
  await env.DB.prepare(
    `INSERT INTO site_text (key, value, updated_at) VALUES ('about_intro', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(intro).run();
  return json({ ok: true });
}
