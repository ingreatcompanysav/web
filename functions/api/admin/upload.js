// POST /api/admin/upload — gated generic image upload to R2. multipart: file.
// Returns { url }. Used for event photos (and any one-off image). The admin
// resizes in the browser first, so we just store the bytes.
import { json } from '../../_shared/db.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const MAX_BYTES = 8 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: 'expected_multipart' }, 400);

  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: 'file_required' }, 400);

  const ct = file.type || 'image/jpeg';
  if (!EXT[ct]) return json({ ok: false, error: 'unsupported_type' }, 415);

  const buf = await file.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ ok: false, error: 'too_large' }, 413);

  const key = `events/${crypto.randomUUID()}.${EXT[ct]}`;
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: ct } });

  return json({ ok: true, key, url: '/img/' + key }, 201);
}
