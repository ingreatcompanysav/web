// Shared helpers.

// Escapes text for interpolation into an HTML template literal. Every view in
// this codebase builds markup as strings, so anything that came from the
// database or a URL goes through here first.
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ENTITIES[c]);
