// Shared helpers.

// Escapes text for interpolation into an HTML template literal. Every view in
// this codebase builds markup as strings, so anything that came from the
// database or a URL goes through here first.
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ENTITIES[c]);

// Endpoint error codes are for us, not for a person reading a form. Both forms
// that post to the API — the newsletter signup and the RSVP modal — map through
// here, so a code added on the server gets one sentence, in one place.
//
// `network` is passed when fetch itself rejected: that is a different failure
// from a server that answered and said no, and it is the one worth retrying.
const MESSAGES = {
  email_invalid: 'That email doesn’t look quite right — mind checking it?',
  email_required: 'Please enter your email address.',
  first_name_required: 'Please tell us your first name.',
  name_required: 'Please tell us your first name.',
  turnstile_failed: 'The spam check didn’t pass. Please try once more.',
  network: 'We couldn’t reach the server. Check your connection and try again.',
};

export function friendly(code) {
  return MESSAGES[code] || 'That didn’t go through. Please try again in a moment.';
}
