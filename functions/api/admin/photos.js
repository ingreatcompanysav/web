// /api/admin/photos — GET (list all, incl. inactive) + POST (upload).
// POST is multipart/form-data: file, slot, alt, width, height. The admin page
// resizes the image in the browser before upload, so the server just stores it.
import { json, photoToAdmin, PHOTO_SLOTS } from '../../_shared/db.js';
import { readImage, putImage } from '../../_shared/upload.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM photos ORDER BY slot ASC, sort_order ASC, id ASC'
  ).all();
  return json((results || []).map(photoToAdmin));
}

export async function onRequestPost({ request, env }) {
  const img = await readImage(request);
  if (img.error) return img.error;

  const { form } = img;
  const slot = PHOTO_SLOTS.includes(form.get('slot')) ? form.get('slot') : 'gallery';
  const alt = String(form.get('alt') || '').slice(0, 300);
  const width = parseInt(form.get('width'), 10) || 0;
  const height = parseInt(form.get('height'), 10) || 0;

  const key = await putImage(env, `photos/${slot}`, img);

  const next = await env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM photos WHERE slot = ?'
  ).bind(slot).first();

  const res = await env.DB.prepare(
    `INSERT INTO photos
       (slot, r2_key, alt, content_type, width, height, bytes, active, sort_order, created_at)
     VALUES (?,?,?,?,?,?,?,1,?, datetime('now'))`
  ).bind(slot, key, alt, img.contentType, width, height, img.buf.byteLength, next.n).run();

  return json({ ok: true, id: res.meta.last_row_id, key, url: '/img/' + key }, 201);
}
