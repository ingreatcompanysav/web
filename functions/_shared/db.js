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

export const methodNotAllowed = (allow) =>
  new Response('Method Not Allowed', { status: 405, headers: { allow } });

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
});

// Admin shape adds ordering/metadata.
export const eventToAdmin = (r) => ({
  ...eventToPublic(r),
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
  active: b.active === 0 || b.active === false ? 0 : 1,
  sort_order: Number.isFinite(+b.sortOrder) ? Math.trunc(+b.sortOrder) : 0,
});

// --- photos -----------------------------------------------------------------
export const PHOTO_SLOTS = ['hero', 'gallery', 'story', 'join'];

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

// --- rsvps ------------------------------------------------------------------
export const rsvpToAdmin = (r) => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  email: r.email,
  guests: r.guests,
  note: r.note,
  syncedSheet: r.synced_sheet,
  createdAt: r.created_at,
});
