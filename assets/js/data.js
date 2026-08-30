// Static copy for the In Great Company site.
//
// The homepage hero and nav are NOT here: they are real markup in index.html,
// which app.js renders around rather than replacing. Keeping a second copy of
// those words in JS is what used to need a CI job to police.
//
// Events and quotes are backend-owned (/api/events, /api/quotes) and have no
// static counterpart here on purpose: an API hiccup should show an empty state,
// never a gathering that does not exist.

// One real testimonial photo keyed by name (matches the live per-card avatar hook).
export const AVATAR_BY_NAME = {
  Victoria: '/assets/img/avatar-victoria.jpg'
};

export const LINKS = {
  instagram: 'https://www.instagram.com/ingreatcompanysav',
  facebook: 'https://www.facebook.com/groups/ingreatcompanysav',
  email: 'mailto:contact@ingreatcompanysav.com',
  emailText: 'contact@ingreatcompanysav.com'
};
