// GET /api/links — public. The active links, in order, for the /links page.
import { json, linkToPublic } from '../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM links WHERE active = 1 ORDER BY sort_order ASC, id ASC'
  ).all();
  return json((results || []).map(linkToPublic));
}
