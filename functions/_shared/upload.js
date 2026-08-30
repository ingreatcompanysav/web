// Shared image intake for the two upload endpoints.
//
// /api/admin/photos stores a library photo (R2 object + a metadata row) and
// /api/admin/upload stores a one-off image for an event or an avatar (R2
// object only). They are separate routes because they mean different things,
// but the part that reads and vets the bytes is identical and lived in both.
import { json } from './db.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const MAX_BYTES = 8 * 1024 * 1024; // the admin resizes in the browser, well below this

// Returns { form, buf, contentType, ext } or { error } holding a ready
// Response. The admin resizes before uploading, so this only has to vet.
export async function readImage(request) {
  const form = await request.formData().catch(() => null);
  if (!form) return { error: json({ ok: false, error: 'expected_multipart' }, 400) };

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return { error: json({ ok: false, error: 'file_required' }, 400) };
  }

  const contentType = file.type || 'image/jpeg';
  if (!EXT[contentType]) return { error: json({ ok: false, error: 'unsupported_type' }, 415) };

  const buf = await file.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return { error: json({ ok: false, error: 'too_large' }, 413) };

  return { form, buf, contentType, ext: EXT[contentType] };
}

// Stores the bytes under `prefix/<uuid>.<ext>` and hands back the key.
export async function putImage(env, prefix, { buf, contentType, ext }) {
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType } });
  return key;
}
