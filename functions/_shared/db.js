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

// --- photos -----------------------------------------------------------------
export const PHOTO_SLOTS = ['hero', 'gallery', 'join'];

// Binary lives in R2; we serve it through the /img/<key> function.
export const photoToPublic = (r) => ({
  id: r.id,
  slot: r.slot,
  url: '/img/' + r.r2_key,
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
