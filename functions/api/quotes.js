// GET /api/quotes — public. Returns the full pool of ACTIVE quotes; the site
// picks a random subset to display on each visit.
import { json, quoteToPublic } from '../_shared/db.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM quotes WHERE active = 1 ORDER BY sort_order ASC, id ASC'
  ).all();
  return json((results || []).map(quoteToPublic));
}
