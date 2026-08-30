// Column definitions for the three admin-editable resources.
//
// Events, quotes and links used to spell their columns out five times each —
// in the INSERT, in the UPDATE, in a *FromBody parser, in a *ToPublic mapper
// and again in a *ToAdmin mapper — across three files per resource. Adding a
// field meant five edits, and forgetting one of them failed silently.
//
// Here each column is declared once. crud.js derives the statements and the
// projections from these lists.

/* ------------------------------------------------------------- parsers */
const str = (v) => (v == null ? '' : String(v));
const trim = (v) => str(v).trim();
const int = (min) => (v) => (Number.isFinite(+v) ? Math.max(min, Math.trunc(+v)) : min);
const flag = (dflt) => (v) => (v === 1 || v === true ? 1 : v === 0 || v === false ? 0 : dflt);
const oneOf = (allowed, dflt) => (v) => (allowed.includes(v) ? v : dflt);
// Accept only a clean ISO date; anything else stores empty (undated).
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '');

const camel = (col) => col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// col   — the database column
// parse — how to read it off an incoming JSON body (omit for read-only columns)
// opts  — required: error code when the parsed value is empty
//         admin:    kept out of the public projection
//         managed:  written by SQL (datetime('now')), never from the body
const f = (col, parse, opts = {}) => ({ col, key: camel(col), parse, ...opts });

/* ------------------------------------------------------------ resources */
// `icon` is a key into the inline SVG set in assets/js/links.js; an unknown
// key falls back to a generic link mark there.
export const LINK_ICONS = ['link', 'instagram', 'facebook', 'email', 'calendar', 'ticket', 'heart'];
export const LINK_TONES = ['rose', 'cyan', 'gold', 'cream'];

export const RESOURCES = {
  events: {
    table: 'events',
    // The only resource with a client-chosen text id (a slug from the title),
    // so it is supplied on create and checked for collisions.
    id: { column: 'id', numeric: false, fromBody: true, required: 'id_required' },
    order: 'sort_order ASC, rowid ASC',
    // Public list hides drafts and cancellations, and computes past/upcoming.
    // 'now' is shifted -5h so the rollover lands around midnight in Savannah
    // (Eastern) rather than mid-evening UTC. Undated events are never past.
    publicWhere: 'hidden = 0',
    publicSelect: `(event_date != '' AND event_date < date('now','-5 hours')) AS is_past`,
    fields: [
      f('title', trim, { required: 'title_required' }),
      // date/time are DISPLAY strings ("Sun, Aug 16" / "9:30am"), printed as-is.
      f('date', str),
      f('time', str),
      f('place', str),
      f('category', str),
      f('tone', (v) => v || 'cyan'),
      f('price', int(0)),
      f('stripe_url', str),
      f('facebook_url', str),
      f('blurb', str),
      f('detail', str),
      f('note', str),
      f('image', str),
      // The real calendar date, used only to place the event as upcoming/past.
      f('event_date', isoDate),
      f('hidden', flag(0), { admin: true }),
      f('sort_order', int(0), { admin: true }),
      f('updated_at', null, { admin: true, managed: true }),
    ],
    // Computed on the way out. `is_past` comes from publicSelect above.
    derive: { past: (r) => !!r.is_past },
  },

  quotes: {
    table: 'quotes',
    id: { column: 'id', numeric: true },
    order: 'sort_order ASC, id ASC',
    publicWhere: 'active = 1',
    fields: [
      f('name', trim, { required: 'name_required' }),
      f('detail', str),
      f('tone', (v) => v || 'cream'),
      f('body', trim, { required: 'body_required' }),
      f('monogram', str),
      f('avatar', str),
      f('active', flag(1), { admin: true }),
      f('sort_order', int(0), { admin: true }),
      f('updated_at', null, { admin: true, managed: true }),
    ],
    derive: {
      // Falls back to the first letter of the name.
      monogram: (r) => r.monogram || (r.name ? r.name.trim().charAt(0).toUpperCase() : ''),
    },
  },

  links: {
    table: 'links',
    id: { column: 'id', numeric: true },
    order: 'sort_order ASC, id ASC',
    publicWhere: 'active = 1',
    fields: [
      f('label', trim, { required: 'label_required' }),
      f('url', trim, { required: 'url_required' }),
      f('subtitle', str),
      f('icon', oneOf(LINK_ICONS, '')),
      f('tone', oneOf(LINK_TONES, 'rose')),
      f('active', flag(1), { admin: true }),
      f('sort_order', int(0), { admin: true }),
      f('updated_at', null, { admin: true, managed: true }),
    ],
  },
};
