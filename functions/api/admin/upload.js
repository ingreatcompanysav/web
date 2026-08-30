// POST /api/admin/upload — gated one-off image upload to R2. multipart: file.
// Returns { url }. Used for event photos and quote avatars; unlike
// /api/admin/photos this stores no metadata row, because nothing lists these.
import { json } from '../../_shared/db.js';
import { readImage, putImage } from '../../_shared/upload.js';

export async function onRequestPost({ request, env }) {
  const img = await readImage(request);
  if (img.error) return img.error;

  const key = await putImage(env, 'events', img);
  return json({ ok: true, key, url: '/img/' + key }, 201);
}
