// Static copy for the In Great Company site.
// Events and quotes are backend-owned (/api/events, /api/quotes) and have no
// static counterpart here on purpose: an API hiccup should show an empty state,
// never a gathering that does not exist.

// One real testimonial photo keyed by name (matches the live per-card avatar hook).
export const AVATAR_BY_NAME = {
  Victoria: '/assets/img/avatar-victoria.jpg'
};

// The homepage hero, in one place. index.html carries a static copy of this
// same hero so crawlers and slow connections get it without running JS (see
// the comment on #app there). The markup is necessarily written out twice;
// the words are not — they live here, and tools/check-static-hero.mjs fails
// the build if index.html stops agreeing. Drift is invisible on the site and
// only ever surfaces in search results, so it needs to be caught mechanically.
export const HERO = {
  eyebrow: "A women's social group · Savannah, GA",
  titleLead: 'Every woman deserves a place to',
  titleScript: 'belong.',
  lead: "New to Savannah, starting a new chapter, or just craving real friendship? There's a seat here for you. No pressure, no judgment, just women showing up for each other.",
  cta: "See What's Coming Up",
  image: '/assets/img/photo-hero.jpg',
  imageAlt: 'In Great Company members laughing together on a sailboat in Savannah',
};

// Nav routes and labels. index.html mirrors these in its static first paint.
export const NAV = [['home', 'Home'], ['gatherings', 'Gatherings']];

export const LINKS = {
  instagram: 'https://www.instagram.com/ingreatcompanysav',
  facebook: 'https://www.facebook.com/groups/ingreatcompanysav',
  email: 'mailto:contact@ingreatcompanysav.com',
  emailText: 'contact@ingreatcompanysav.com'
};
