// /api/admin/photos — GET (list all, incl. inactive) + POST (upload).
// POST is multipart/form-data: file, slot, alt, width, height. The admin page
// resizes the image in the browser before upload, so the server just stores bytes.
import { json, photoToAdmin, PHOTO_SLOTS } from '../../_shared/db.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB ceiling; the admin resizes well below this

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM photos ORDER BY slot ASC, sort_order ASC, id ASC'
  ).all();
  return json((results || []).map(photoToAdmin));
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: 'expected_multipart' }, 400);

  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: 'file_required' }, 400);

  const ct = file.type || 'image/jpeg';
  if (!EXT[ct]) return json({ ok: false, error: 'unsupported_type' }, 415);

  const buf = await file.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ ok: false, error: 'too_large' }, 413);

  const slot = PHOTO_SLOTS.includes(form.get('slot')) ? form.get('slot') : 'gallery';
  const alt = String(form.get('alt') || '').slice(0, 300);
  const width = parseInt(form.get('width'), 10) || 0;
  const height = parseInt(form.get('height'), 10) || 0;

  const key = `photos/${slot}/${crypto.randomUUID()}.${EXT[ct]}`;
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: ct } });

  const next = await env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM photos WHERE slot = ?'
  ).bind(slot).first();

  const res = await env.DB.prepare(
    `INSERT INTO photos
       (slot, r2_key, alt, content_type, width, height, bytes, active, sort_order, created_at)
     VALUES (?,?,?,?,?,?,?,1,?, datetime('now'))`
  ).bind(slot, key, alt, ct, width, height, buf.byteLength, next.n).run();

  return json({ ok: true, id: res.meta.last_row_id, key, url: '/img/' + key }, 201);
}
