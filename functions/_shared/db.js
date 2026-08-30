// Shared helpers for the Pages Functions API.
// (An underscore-prefixed directory is NOT routed by Pages.)

export const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });

// --- events -----------------------------------------------------------------
// Public shape must match the old events.json exactly (keys the bundle reads).
export const eventToPublic = (r) => ({
  id: r.id,
  title: r.title,
  date: r.date,
  time: r.time,
  place: r.place,
  category: r.category,
  tone: r.tone,
  price: r.price,
  stripeUrl: r.stripe_url,
  facebookUrl: r.facebook_url,
  blurb: r.blurb,
  detail: r.detail,
  note: r.note,
  image: r.image || '',
  eventDate: r.event_date || '',
  // `is_past` is computed by the public query (event_date vs today). Hidden
  // events are filtered out server-side; the site only buckets past vs upcoming.
  past: !!r.is_past,
});

// Admin shape adds the raw hide flag + ordering/metadata. (`eventDate`/`past`
// already come from eventToPublic; admin computes past client-side for display.)
export const eventToAdmin = (r) => ({
  ...eventToPublic(r),
  hidden: r.hidden ? 1 : 0,
  sortOrder: r.sort_order,
  updatedAt: r.updated_at,
});

// Normalize an incoming event payload (camelCase) into DB columns.
export const eventFromBody = (b = {}) => ({
  id: String(b.id || '').trim(),
  title: String(b.title || '').trim(),
  date: b.date ?? '',
  time: b.time ?? '',
  place: b.place ?? '',
  category: b.category ?? '',
  tone: b.tone || 'cyan',
  price: Number.isFinite(+b.price) ? Math.max(0, Math.trunc(+b.price)) : 0,
  stripe_url: b.stripeUrl ?? '',
  facebook_url: b.facebookUrl ?? '',
  blurb: b.blurb ?? '',
  detail: b.detail ?? '',
  note: b.note ?? '',
  image: b.image ?? '',
  // Accept only a clean ISO date; anything else stores empty (undated).
  event_date: /^\d{4}-\d{2}-\d{2}$/.test(b.eventDate || '') ? b.eventDate : '',
  hidden: b.hidden === 1 || b.hidden === true ? 1 : 0,
  sort_order: Number.isFinite(+b.sortOrder) ? Math.trunc(+b.sortOrder) : 0,
});

// --- quotes -----------------------------------------------------------------
export const quoteToPublic = (r) => ({
  id: r.id,
  name: r.name,
  detail: r.detail,
  tone: r.tone,
  body: r.body,
  monogram: r.monogram || (r.name ? r.name.trim().charAt(0).toUpperCase() : ''),
  avatar: r.avatar || '',
});

export const quoteToAdmin = (r) => ({
  ...quoteToPublic(r),
  active: r.active,
  sortOrder: r.sort_order,
  updatedAt: r.updated_at,
});

export const quoteFromBody = (b = {}) => ({
  name: String(b.name || '').trim(),
  detail: b.detail ?? '',
  tone: b.tone || 'cream',
  body: String(b.body || '').trim(),
  monogram: b.monogram ?? '',
  avatar: b.avatar ?? '',
  active: b.active === 0 || b.active === false ? 0 : 1,
  sort_order: Number.isFinite(+b.sortOrder) ? Math.trunc(+b.sortOrder) : 0,
});

// --- links -------------------------------------------------------------------
// The /links page (Linktree-style). `icon` is a key into the inline SVG set in
// assets/js/links.js; unknown keys fall back to a generic link mark there.
export const LINK_ICONS = ['link', 'instagram', 'facebook', 'email', 'calendar', 'ticket', 'heart'];
export const LINK_TONES = ['rose', 'cyan', 'gold', 'cream'];

export const linkToPublic = (r) => ({
  id: r.id,
  label: r.label,
  url: r.url,
  subtitle: r.subtitle || '',
  icon: r.icon || '',
  tone: r.tone || 'rose',
});

export const linkToAdmin = (r) => ({
  ...linkToPublic(r),
  active: r.active,
  sortOrder: r.sort_order,
  updatedAt: r.updated_at,
});

export const linkFromBody = (b = {}) => ({
  label: String(b.label || '').trim(),
  url: String(b.url || '').trim(),
  subtitle: b.subtitle ?? '',
  icon: LINK_ICONS.includes(b.icon) ? b.icon : '',
  tone: LINK_TONES.includes(b.tone) ? b.tone : 'rose',
  active: b.active === 0 || b.active === false ? 0 : 1,
  sort_order: Number.isFinite(+b.sortOrder) ? Math.trunc(+b.sortOrder) : 0,
});

// --- photos -----------------------------------------------------------------
export const PHOTO_SLOTS = ['hero', 'gallery', 'join'];

// Binary lives in R2; we serve it through the /img/<key> function.
export const photoUrl = (r) => '/img/' + r.r2_key;

export const photoToPublic = (r) => ({
  id: r.id,
  slot: r.slot,
  url: photoUrl(r),
  alt: r.alt || '',
});

export const photoToAdmin = (r) => ({
  ...photoToPublic(r),
  key: r.r2_key,
  contentType: r.content_type,
  width: r.width,
  height: r.height,
  bytes: r.bytes,
  active: r.active,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

// --- subscribers --------------------------------------------------------------
// Newsletter list. The token is the unsubscribe credential, so it is never
// exposed by a public endpoint — only the admin shape and the Sheet mirror
// carry it (the Sheet needs it to build each person's unsubscribe link).
export const subscriberToAdmin = (r) => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name || '',
  email: r.email,
  status: r.status || 'subscribed',
  source: r.source || '',
  syncedSheet: r.synced_sheet,
  createdAt: r.created_at,
  unsubscribedAt: r.unsubscribed_at || '',
});

// Lowercased + trimmed so "A@B.com" and "a@b.com " are one subscriber.
export const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

// Deliberately permissive — just enough to catch typos, not to police the RFC.
export const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// 128 bits of randomness, hex. Unguessable, so a one-click unsubscribe link
// needs no login and can't be brute-forced across the list.
export const newToken = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

// --- rsvps ------------------------------------------------------------------
export const rsvpToAdmin = (r) => ({
  id: r.id,
  eventId: r.event_id,
  firstName: r.first_name || '',
  lastName: r.last_name || '',
  name: r.name,
  email: r.email,
  guests: r.guests,
  note: r.note,
  syncedSheet: r.synced_sheet,
  createdAt: r.created_at,
});
