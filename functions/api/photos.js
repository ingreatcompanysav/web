// GET /api/photos — public. Active photos grouped by slot, in sort order.
// Shape: { hero: [{id,slot,url,alt}], gallery: [...], story: [...], join: [...] }
// The site rotates a random hero/story/join per visit and renders gallery as a grid.
import { json, photoToPublic, PHOTO_SLOTS } from '../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM photos WHERE active = 1 ORDER BY slot ASC, sort_order ASC, id ASC'
  ).all();

  const bySlot = {};
  for (const s of PHOTO_SLOTS) bySlot[s] = [];
  for (const r of results || []) {
    (bySlot[r.slot] || (bySlot[r.slot] = [])).push(photoToPublic(r));
  }
  return json(bySlot);
}
