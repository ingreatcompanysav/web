// GET /api/about — public. Everything the Who we are page shows:
// { intro: "paragraphs\n\nseparated by blank lines", team: [{id,name,role,bio,photo}] }
import { json } from '../_shared/db.js';
import { publicList } from '../_shared/crud.js';

const team = publicList('team');

export async function onRequestGet(ctx) {
  const [row, people] = await Promise.all([
    ctx.env.DB.prepare("SELECT value FROM site_text WHERE key = 'about_intro'").first(),
    team.onRequestGet(ctx).then((r) => r.json()),
  ]);
  return json({ intro: row ? row.value : '', team: people });
}
