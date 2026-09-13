// /api/admin/facebook-event — read the public bits of a Facebook event so the
// admin can prefill a gathering from its link.
//
//   POST { url }        -> { ok, title, eventDate, place, image }
//   GET  ?image=<url>   -> the event's cover photo, proxied
//
// There is no API for this: Meta closed the Groups API in 2024 and a normal
// fetch of an event page gets the login wall. Facebook does still answer its
// own link-preview crawler with Open Graph tags, so we ask as that crawler.
// That door only gives title, date, venue and cover photo — time and
// description are never there, so those stay manual. A private event, or a
// change of heart at Meta, comes back as `event_not_public`.
import { json } from '../../_shared/db.js';

const UA = { 'user-agent': 'facebookexternalhit/1.1', 'accept-language': 'en-US' };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'").replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const meta = (html, prop) => {
  const m = html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`));
  return m ? decode(m[1]) : '';
};

export async function onRequestPost({ request }) {
  const body = await request.json().catch(() => null);
  const id = ((body && body.url) || '').match(/facebook\.com\/events\/(?:[^/?#]+\/)*?(\d{6,})/);
  if (!id) return json({ ok: false, error: 'not_a_facebook_event_link' }, 400);

  let html = '';
  try {
    const res = await fetch(`https://www.facebook.com/events/${id[1]}/`, { headers: UA });
    if (res.ok) html = await res.text();
  } catch {
    return json({ ok: false, error: 'facebook_unreachable' }, 502);
  }
  const title = meta(html, 'og:title');
  if (!title || /log in or sign up/i.test(title)) {
    return json({ ok: false, error: 'event_not_public' }, 404);
  }

  // "Party event in Savannah by Krewe of ... on Saturday, March 1 2025 with 662 people interested"
  const d = meta(html, 'og:description').match(/\bon \w+, (\w+) (\d{1,2}),? (\d{4})/);
  const mo = d ? MONTHS.indexOf(d[1].toLowerCase()) : -1;
  const eventDate = mo < 0 ? ''
    : `${d[3]}-${String(mo + 1).padStart(2, '0')}-${d[2].padStart(2, '0')}`;

  // The canonical URL carries the venue as its first slug segment:
  // /events/lone-wolf-lounge/4th-annual-lantern-parade/585159994436286/
  const slug = (meta(html, 'og:url').match(/\/events\/([^/]+)\/[^/]+\/\d+/) || [])[1] || '';
  const place = slug.split('-').filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

  return json({ ok: true, title, eventDate, place, image: meta(html, 'og:image') });
}

// The cover photo sits behind the same crawler-only door, so the browser
// can't fetch it itself. Proxy it, and only from Facebook's own image hosts
// so this can't be used to fetch anything else. The admin then runs it
// through its usual resize-and-upload path like any other picked photo.
export async function onRequestGet({ request }) {
  const src = new URL(request.url).searchParams.get('image') || '';
  const host = (src.match(/^https:\/\/([^/]+)\//) || [])[1] || '';
  if (!/(^|\.)(fbsbx\.com|fbcdn\.net|facebook\.com)$/.test(host)) {
    return json({ ok: false, error: 'not_a_facebook_image' }, 400);
  }
  const res = await fetch(src, { headers: UA });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) return json({ ok: false, error: 'image_unavailable' }, 502);
  return new Response(res.body, { headers: { 'content-type': type, 'cache-control': 'no-store' } });
}
