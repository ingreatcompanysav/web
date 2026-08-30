// In Great Company — client app. Recreates the original SPA (routes: home,
// gatherings, event, privacy) as modular, data-driven views.
import { loadEvents, loadVoices, loadPhotos } from './api.js';
import { AVATAR_BY_NAME, LINKS } from './data.js';
import { openRSVP, closeRSVP } from './rsvp.js';
import { mountSignup } from './signup.js';

/* ----------------------------------------------------------------- helpers */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const scriptWord = (word, xl) => `<span class="igc-script${xl ? ' igc-script--xl' : ''}">${esc(word)}</span>`;

/* --------------------------------------------------------------- components */
/* Social + contact marks. Inline SVG so they take the surrounding text colour
   and need no icon font or extra request. */
const ICONS = {
  instagram: `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none"/></svg>`,
  facebook: `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.01 3.66 9.17 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.45 2.91h-2.33V22c4.78-.77 8.44-4.93 8.44-9.94Z"/></svg>`,
  email: `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.6" y="4.6" width="18.8" height="14.8" rx="2.6"/><path d="m3.6 7.4 8.4 5.8 8.4-5.8"/></svg>`
};

function sectionHeading({ eyebrow, title, script, description, center, size }) {
  const xl = size === 'xl';
  const cls = ['section-heading'];
  if (center) cls.push('section-heading--center');
  if (xl) cls.push('section-heading--xl');
  return `<header class="${cls.join(' ')}">
    ${eyebrow ? `<div class="igc-eyebrow section-heading__eyebrow">${esc(eyebrow)}</div>` : ''}
    <h2 class="section-heading__title">${esc(title)}${script ? ' ' + scriptWord(script, xl) : ''}</h2>
    ${description ? `<p class="section-heading__desc">${esc(description)}</p>` : ''}
  </header>`;
}

function button({ label, variant = 'default', size, full, action, id, icon }) {
  const cls = ['btn', `btn--${variant}`];
  if (size) cls.push(`btn--${size}`);
  if (full) cls.push('btn--full');
  const mark = ICONS[icon] || '';
  return `<button type="button" class="${cls.join(' ')}"${action ? ` data-action="${action}"` : ''}${id ? ` data-id="${esc(id)}"` : ''}>${mark}${esc(label)}</button>`;
}

function tag(label, { tone, outlined } = {}) {
  const cls = ['tag'];
  if (outlined) cls.push('tag--outlined');
  if (tone) cls.push(`tag--${tone}`);
  return `<span class="${cls.join(' ')}">${esc(label)}</span>`;
}

const statusOf = (g) => (g.price ? `$${g.price} · tickets` : null);

// Branded stand-in when an event has no uploaded photo — a tone-tinted wash with
// a faded script initial, instead of the raw "Photo — …" description text.
function mediaPlaceholder(g) {
  const initial = ((g.title || '').trim().charAt(0) || '·').toUpperCase();
  return `<span class="media-ph media-ph--${esc(g.tone || 'cyan')}" aria-hidden="true"><span class="media-ph__mark">${esc(initial)}</span></span>`;
}

function eventCard(g, row) {
  const status = g.past ? null : statusOf(g);
  const meta = [g.date, g.time, row ? g.place : null].filter(Boolean).join(' · ');
  return `<button type="button" class="event-card${row ? ' event-card--row' : ''}" data-action="open-event" data-id="${esc(g.id)}">
    <div class="event-card__media">
      ${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.title)}" loading="lazy">` : mediaPlaceholder(g)}
      ${status ? `<span class="event-card__status">${tag(status, { tone: 'gold' })}</span>` : ''}
    </div>
    <div class="event-card__body">
      <div class="event-card__meta">
        <span class="igc-eyebrow event-card__date">${esc(meta)}</span>
        ${g.category ? tag(g.category, { tone: g.tone || 'cyan' }) : ''}
      </div>
      <h3 class="event-card__title">${esc(g.title)}</h3>
      <p class="event-card__blurb">${esc(g.blurb || '')}</p>
    </div>
  </button>`;
}

function ticketBuy(o) {
  return `
    <div class="igc-eyebrow">${esc(o.priceLabel)}</div>
    <h2 class="ticket__head">${esc(o.priceHead)}</h2>
    <p class="ticket__note">${esc(o.priceNote)}</p>
    <div class="seats">
      <span class="seats__label" id="seats-label">Seats</span>
      <div class="seats__ctrls" role="group" aria-labelledby="seats-label">
        <button type="button" class="seats__btn" aria-label="One fewer seat" data-action="dec-qty"${o.qty <= 1 ? ' disabled' : ''}>−</button>
        <span class="seats__qty" aria-live="polite" aria-label="${o.qty} ${o.qty === 1 ? 'seat' : 'seats'}">${o.qty}</span>
        <button type="button" class="seats__btn" aria-label="One more seat" data-action="inc-qty"${o.qty >= 6 ? ' disabled' : ''}>+</button>
      </div>
    </div>
    <div class="ticket__total"><span class="ticket__total-label">Total</span><span class="ticket__total-val">${esc(o.total)}</span></div>
    <div class="ticket__actions">${button({ label: o.cta, size: 'lg', full: true, action: 'buy' })}</div>
    <p class="ticket__fine">${esc(o.fine)}</p>`;
}

function ticketConfirmed(line) {
  return `
    <div class="igc-eyebrow" style="color:var(--brand-on-dark)">Your seat is saved</div>
    <h2 class="ticket__head">See you there. 💛</h2>
    <p class="ticket__note" style="margin-top:var(--space-4)">${esc(line)} We'll send the details a few days before — and if plans change, no explanation needed.</p>
    <div class="ticket__confirm-actions">
      ${button({ label: 'Bring Someone Else Too', variant: 'outline', full: true, action: 'reset-purchase' })}
    </div>`;
}

// Paid gathering with no Stripe checkout: never take a money-less RSVP through the
// free path. If the event has a Facebook event, send people there for tickets;
// otherwise point at Instagram until the link goes up.
function ticketPending(g) {
  const fb = (g.facebookUrl || '').trim();
  const note = fb
    ? 'Tickets and details live on the Facebook event — tap through to save your spot.'
    : 'Ticketing for this gathering opens soon. Follow along and we\'ll share the link the moment seats go live.';
  const cta = fb
    ? button({ label: 'See The Facebook Event', variant: 'outline', size: 'lg', full: true, action: 'open-fb-event', id: fb })
    : button({ label: 'Follow For The Link', variant: 'outline', size: 'lg', full: true, action: 'open-instagram' });
  return `
    <div class="igc-eyebrow">Tickets</div>
    <h2 class="ticket__head">$${g.price} a seat</h2>
    <p class="ticket__note">${esc(note)}</p>
    <div class="ticket__actions">${cta}</div>
    <p class="ticket__fine">Can't wait? Email us at <a href="${LINKS.email}" style="color:inherit">${LINKS.emailText}</a> and we'll hold you a seat.</p>`;
}

// A gathering that has already happened: no RSVP, just a warm nudge toward
// what's next.
function ticketPast() {
  return `
    <div class="igc-eyebrow">Looking back</div>
    <h2 class="ticket__head">This one's already happened. 💛</h2>
    <p class="ticket__note">We had a lovely time. Catch the next one — see what's coming up, or follow along so you don't miss the next plan.</p>
    <div class="ticket__actions">${button({ label: "See What's Coming Up", size: 'lg', full: true, action: 'go-gatherings' })}</div>
    <p class="ticket__fine">Follow <a href="${LINKS.instagram}" style="color:inherit" target="_blank" rel="noopener noreferrer">@ingreatcompanysav</a> for last-minute gatherings.</p>`;
}

function quoteCard(v) {
  const initial = (v.monogram || (v.name || '').trim().charAt(0) || '').toUpperCase();
  const photo = v.avatar || AVATAR_BY_NAME[v.name];
  const avatar = photo
    ? `<span class="quote__avatar"><img src="${esc(photo)}" alt="${esc(v.name)}"></span>`
    : `<span class="quote__avatar" title="${esc(v.name)}">${esc(initial)}</span>`;
  return `<figure class="quote${v.tone === 'deep' ? ' quote--deep' : ''}">
    <blockquote class="quote__body">“${esc(v.quote)}”</blockquote>
    <figcaption class="quote__cite">
      ${avatar}
      <span>
        <span class="quote__name">${esc(v.name)}</span>
        <span class="quote__detail">${esc(v.detail || '')}</span>
      </span>
    </figcaption>
  </figure>`;
}

/* -------------------------------------------------------------- chrome */
const NAV = [['home', 'Home'], ['gatherings', 'Gatherings']];

function navBar(active) {
  const links = NAV.map(([r, l]) =>
    `<button class="nav__link${active === r ? ' is-active' : ''}" data-nav="${r}">${l}</button>`).join('');
  return `<nav class="nav" id="nav">
    <button class="nav__logo" data-nav="home" aria-label="In Great Company — home"><img src="/assets/img/logo-cream.png" alt="In Great Company"></button>
    <div class="nav__links">${links}</div>
  </nav>`;
}

function footer() {
  return `<footer class="footer">
    <div class="footer__grid">
      <div>
        <img class="footer__logo" src="/assets/img/logo-cream.png" alt="In Great Company">
        <p class="footer__blurb">A women's social group in Savannah, Georgia. Come as you are. You're in great company. 💛</p>
      </div>
      <div class="footer__col">
        <span class="igc-eyebrow footer__head">Wander over</span>
        <button class="footer__link" data-nav="gatherings" style="text-align:left;background:none;border:0;cursor:pointer">Gatherings</button>
      </div>
      <div class="footer__col">
        <span class="igc-eyebrow footer__head">Say hi</span>
        <a class="footer__link" href="${LINKS.instagram}" target="_blank" rel="noopener noreferrer">${ICONS.instagram}<span>@ingreatcompanysav</span></a>
        <a class="footer__link" href="${LINKS.facebook}" target="_blank" rel="noopener noreferrer">${ICONS.facebook}<span>Facebook Group</span></a>
        <a class="footer__link" href="${LINKS.email}">${ICONS.email}<span>${LINKS.emailText}</span></a>
      </div>
    </div>
    <div class="footer__bar">
      <span class="footer__note">Savannah, Georgia</span>
      <button type="button" class="footer__legal" data-nav="privacy">Privacy Policy</button>
      <span class="footer__note">Women first, always.</span>
    </div>
  </footer>`;
}

/* ---------------------------------------------------------------- views */
function homeView(state) {
  const featured = state.events.filter((g) => !g.past).slice(0, 3);
  return `
  <section class="hero">
    <div class="hero__grid">
      <div>
        <div class="igc-eyebrow">A women's social group · Savannah, GA</div>
        <h1 class="hero__title">Every woman deserves a place to<br>${scriptWord('belong.', true)}</h1>
        <p class="hero__lead">New to Savannah, starting a new chapter, or just craving real friendship? There's a seat here for you. No pressure, no judgment, just women showing up for each other.</p>
        <div class="hero__actions">
          ${button({ label: "See What's Coming Up", size: 'lg', action: 'go-gatherings' })}
        </div>
      </div>
      <div class="hero__media"><img src="${esc(state.photos.hero || '/assets/img/photo-hero.jpg')}" alt="In Great Company members laughing together on a sailboat in Savannah"></div>
    </div>
  </section>

  <section class="section section--page">
    <div class="container">
      <div class="section-head">
        ${sectionHeading({ eyebrow: 'Follow along', title: 'The everyday, as it happens', script: 'here', size: 'xl', description: 'Instagram is where we live day to day: the feed, the faces, the last-minute plans. Everything coming up lives on the calendar right here.' })}
        <div class="cluster">
          ${button({ label: '@ingreatcompanysav', variant: 'outline', action: 'open-instagram', icon: 'instagram' })}
          ${button({ label: 'Facebook Group', variant: 'outline', action: 'open-facebook', icon: 'facebook' })}
        </div>
      </div>
      ${state.photos.gallery && state.photos.gallery.length ? `<div class="gallery mt-8">${state.photos.gallery.map((p) => `<figure class="gallery__item"><img src="${esc(p.url)}" alt="${esc(p.alt || '')}" loading="lazy"></figure>`).join('')}</div>` : ''}
    </div>
  </section>

  <section class="section section--card">
    <div class="container">
      <div class="section-head">
        ${sectionHeading({ eyebrow: "What's coming up", title: 'Three ways to spend a', script: 'week', description: 'Coffee, long dinners, and slow Sunday mornings. Come to one, come to all of them.' })}
        ${button({ label: 'See All Gatherings →', variant: 'ghost', action: 'go-gatherings' })}
      </div>
      <div class="grid-3 mt-8">${featured.map((g) => eventCard(g)).join('')}</div>
    </div>
  </section>

  <section class="section section--sunk">
    <div class="container">
      ${sectionHeading({ center: true, size: 'xl', eyebrow: 'In their words', title: 'Women who came alone', script: 'once' })}
      <div class="grid-3 mt-8">${state.voices.map(quoteCard).join('')}</div>
    </div>
  </section>

  <section class="section section--card">
    <div class="container newsletter">
      ${sectionHeading({ center: true, eyebrow: 'Stay in the loop', title: 'The occasional note, worth', script: 'opening', description: "Where we're meeting next, and the plans that come together too fast for the calendar. No noise, and you can leave any time." })}
      <div class="newsletter__form" id="signup"></div>
    </div>
  </section>

  <section class="section section--rose">
    <div class="cta-band">
      <h2 class="cta-band__title">Come as you are.<br>You're in great company. 💛</h2>
      <p class="cta-band__lead">Pick a gathering that sounds like you and save your seat. No application, no fee, just show up.</p>
      <div class="cta-band__actions">${button({ label: "See What's Coming Up", variant: 'inverse', size: 'lg', action: 'go-gatherings' })}</div>
    </div>
  </section>`;
}

function gatheringsView(state) {
  const upcoming = state.events.filter((g) => !g.past);
  // Past gatherings read best most-recent-first (by real date when we have it).
  const past = state.events
    .filter((g) => g.past)
    .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));
  return `
  <section class="section" style="background:var(--wash-golden);padding:72px var(--gutter-lg) 64px">
    <div class="container">
      ${sectionHeading({ eyebrow: 'Gatherings', title: "What's on the calendar", script: 'soon', description: 'Free unless it says otherwise. Tickets hold your seat and cover the table.' })}
    </div>
  </section>
  <section class="section section--page" style="padding:var(--space-9) var(--gutter-lg) var(--section-y)">
    <div class="container" style="display:flex;flex-direction:column;gap:var(--space-5)">
      ${upcoming.length
        ? upcoming.map((g) => eventCard(g, true)).join('')
        : `<p class="prose-lead" style="text-align:center;margin-inline:auto">Nothing on the calendar this very minute — check back soon, or follow along on Instagram for the next last-minute plan.</p>`}
    </div>
  </section>
  ${past.length ? `
  <section class="section section--sunk" style="padding:var(--space-8) var(--gutter-lg) var(--section-y)">
    <div class="container">
      <details class="past-gatherings">
        <summary class="past-gatherings__summary">
          <span class="igc-eyebrow">Looking back</span>
          <span class="past-gatherings__title">Past gatherings <span class="past-gatherings__count">${past.length}</span></span>
        </summary>
        <div class="past-gatherings__list">
          ${past.map((g) => eventCard(g, true)).join('')}
        </div>
      </details>
    </div>
  </section>` : ''}`;
}

function eventView(state) {
  // Events load async; don't guess the first event or flash "not found" mid-load.
  if (!state.loaded && !state.events.length) return loadingView('Finding this gathering…');
  const g = state.events.find((e) => e.id === state.eventId);
  if (!g) return placeholderView('Gathering details', 'That gathering could not be found — it may have already happened, or the link is a little off. Everything on now is on the gatherings page.');
  const price = g.price;
  const meta = [g.date, g.time, g.place].filter(Boolean).join(' · ');
  const total = price ? `$${price * state.qty}` : 'Free';
  // A paid event with no Stripe link must not silently become a free RSVP.
  const ticketingUnavailable = price > 0 && !g.stripeUrl;
  const panel = g.past
    ? ticketPast()
    : state.purchased
    ? ticketConfirmed(price ? `Receipt for ${total} is on its way to your inbox.` : `We’ve got you down for ${state.qty}.`)
    : ticketingUnavailable
    ? ticketPending(g)
    : ticketBuy({
        priceLabel: price ? 'Tickets' : 'Free to come',
        priceHead: price ? `$${price} a seat` : 'Just tell us you’re coming',
        priceNote: price
          ? 'Your ticket covers the table and holds your seat. Checkout is handled by Stripe.'
          : 'No ticket, no charge. We just like to know how many chairs to pull up.',
        fine: price
          ? 'Secure checkout — card, Apple Pay, or Google Pay. Refunds up to 48 hours before, no explanation needed.'
          : 'No charge, and nothing to commit to — change your mind any time, even the morning of.',
        qty: state.qty, total, cta: price ? 'Get My Ticket' : 'Save My Seat'
      });
  return `
  <section class="section section--page" style="padding:var(--space-8) var(--gutter-lg) var(--section-y)">
    <div class="container">
      <button class="back-link" data-action="go-gatherings">← All gatherings</button>
      <div class="event-detail">
        <div>
          <div class="event-detail__media">${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.title)}">` : mediaPlaceholder(g)}</div>
          <div class="igc-eyebrow event-detail__meta">${esc(meta)}</div>
          <h1 class="event-detail__title">${esc(g.title)}</h1>
          <p class="event-detail__prose">${esc(g.blurb || '')}</p>
          ${g.detail ? `<p class="event-detail__prose" style="margin-top:0">${esc(g.detail)}</p>` : ''}
          <div class="event-detail__tags">
            ${tag('Come alone welcome', { tone: 'cyan' })}
            ${(g.tags || []).map((t) => tag(t, { outlined: true })).join('')}
          </div>
        </div>
        <aside class="ticket">${panel}</aside>
      </div>
    </div>
  </section>`;
}

function privacyView() {
  return `
  <section class="story-hero">
    <div class="story-hero__inner">
      <div class="igc-eyebrow">The fine print</div>
      <h1 class="story-hero__title">Privacy Policy</h1>
      <p class="story-hero__lead">Short version: we collect just enough to save you a seat and keep you in the loop about our gatherings. We never sell your information, and we never share it to anyone outside In Great Company.</p>
    </div>
  </section>
  <section class="section section--page">
    <div class="container">
      <div class="legal">
        <p class="legal__updated">Last updated: August 2026</p>

        <p>In Great Company (“we,” “us,” or “our”) is a women’s social group based in Savannah, Georgia. This policy explains what information we collect through <strong>ingreatcompanysav.com</strong>, why we collect it, and the choices you have.</p>

        <h2>What we collect</h2>
        <p>When you RSVP to a gathering, we ask for:</p>
        <ul>
          <li><strong>Your name</strong>, so we know who’s coming.</li>
          <li><strong>Your email address</strong> (optional), so we can send you details and updates about the gathering you signed up for.</li>
          <li><strong>Number of guests</strong>, so we can plan the right amount of space.</li>
          <li><strong>Any note you add</strong>, anything you’d like us to know, shared at your discretion.</li>
        </ul>
        <p>We only collect what you choose to type into the RSVP form. We don’t use tracking cookies or third-party advertising trackers on this site.</p>

        <h2>How we use it</h2>
        <p>We use your information solely to organize our gatherings: confirming your RSVP, planning for the number of attendees, and contacting you about the event you signed up for or future In Great Company events.</p>

        <h2>What we never do</h2>
        <p>We do not sell, rent, or trade your information. We do not share it with advertisers or any third party outside of what’s needed to run the site and communicate with you (for example, the secure services that host our website and store RSVPs on our behalf).</p>

        <h2>How your information is stored</h2>
        <p>RSVPs are stored using reputable third-party service providers (such as Cloudflare) that host our website and database. We take reasonable steps to keep your information secure, though no method of storage is ever completely guaranteed.</p>

        <h2>Your choices</h2>
        <p>You’re always in control of your information. If you’d like us to update or delete what we have on file, just email us at <a href="${LINKS.email}">${LINKS.emailText}</a> and we’ll take care of it. If we ever send you event emails, every one will include a way to unsubscribe.</p>

        <h2>Age</h2>
        <p>Our gatherings are intended for adults. If a particular event has its own age requirement, we’ll say so on that event’s page.</p>

        <h2>Changes to this policy</h2>
        <p>If we update this policy, we’ll revise the “last updated” date above. Meaningful changes will be reflected here on this page.</p>

        <h2>Contact us</h2>
        <p>Questions about your privacy or this policy? Reach us anytime at <a href="${LINKS.email}">${LINKS.emailText}</a>. 💛</p>
      </div>
    </div>
  </section>`;
}

// Fallback only (event id that no longer exists).
function placeholderView(title, sub) {
  return `<section class="section section--page" style="min-height:52vh;display:grid;place-items:center">
    <div class="container" style="text-align:center">
      ${sectionHeading({ center: true, eyebrow: 'Not found', title, script: 'sorry' })}
      <p class="prose-lead" style="margin-left:auto;margin-right:auto">${esc(sub)}</p>
      <div style="margin-top:var(--space-6)">${button({ label: 'See All Gatherings', size: 'lg', action: 'go-gatherings' })}</div>
    </div>
  </section>`;
}

// Shown while events are still loading (deep link straight to an event).
function loadingView(msg) {
  return `<section class="section section--page" style="min-height:52vh;display:grid;place-items:center">
    <div class="container" style="text-align:center">
      <p class="prose-lead" aria-live="polite" style="margin-left:auto;margin-right:auto">${esc(msg)}</p>
    </div>
  </section>`;
}

/* ---------------------------------------------------------------- router */
const state = { route: 'home', events: [], voices: [], photos: {}, eventId: null, qty: 1, purchased: false, loaded: false };

function parseHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  if (!h) return { route: 'home' };
  const [route, id] = h.split('/');
  return { route, id };
}

function viewFor(route) {
  switch (route) {
    case 'home': return homeView(state);
    case 'gatherings': return gatheringsView(state);
    case 'privacy': return privacyView();
    case 'event': return eventView(state);
    default: return homeView(state);
  }
}

let lastKey = null;
function render() {
  const { route, id } = parseHash();
  state.route = route;
  if (route === 'event' && id && id !== state.eventId) {
    state.eventId = id; state.qty = 1; state.purchased = false;
  }
  const navActive = route === 'event' ? 'gatherings' : route;
  const app = document.getElementById('app');
  app.innerHTML = navBar(navActive) + `<main id="view">${viewFor(route)}</main>` + footer();
  mountSignup(document.getElementById('signup'), { source: 'home' });
  syncNavScroll();
  const key = route + '/' + (id || '');
  if (key !== lastKey) { window.scrollTo(0, 0); lastKey = key; } // don't jump on in-place re-render (qty, purchase)
}

function syncNavScroll() {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 10);
}

/* --------------------------------------------------------- interactions */
function go(route) { location.hash = route === 'home' ? '' : `#${route}`; }

document.addEventListener('click', (e) => {
  const navEl = e.target.closest('[data-nav]');
  if (navEl) { e.preventDefault(); go(navEl.getAttribute('data-nav')); return; }
  const act = e.target.closest('[data-action]');
  if (!act) return;
  const action = act.getAttribute('data-action');
  const id = act.getAttribute('data-id');
  switch (action) {
    case 'go-gatherings': go('gatherings'); break;
    case 'open-instagram': window.open(LINKS.instagram, '_blank', 'noopener'); break;
    case 'open-facebook': window.open(LINKS.facebook, '_blank', 'noopener'); break;
    case 'open-fb-event': if (id) window.open(id, '_blank', 'noopener'); break;
    case 'open-event': location.hash = `#event/${id}`; break;
    case 'inc-qty': state.qty = Math.min(6, state.qty + 1); render(); refocusSeat('inc-qty'); break;
    case 'dec-qty': state.qty = Math.max(1, state.qty - 1); render(); refocusSeat('dec-qty'); break;
    case 'reset-purchase': state.purchased = false; state.qty = 1; render(); break;
    case 'buy': buyCurrent(); break;
    default: break;
  }
});

// The whole view re-renders on a seat change, so restore focus to the stepper
// (or its still-enabled sibling when we hit a bound) for keyboard users.
function refocusSeat(action) {
  const other = action === 'inc-qty' ? 'dec-qty' : 'inc-qty';
  const btn = document.querySelector(`.seats__btn[data-action="${action}"]:not([disabled])`)
    || document.querySelector(`.seats__btn[data-action="${other}"]:not([disabled])`);
  if (btn) btn.focus();
}

// Paid + stripeUrl → Stripe. Paid without a link → do nothing (the panel already
// shows the "opens soon" state). Free → RSVP modal, prefilled with the seat count.
function buyCurrent() {
  const g = state.events.find((e) => e.id === state.eventId);
  if (!g) return;
  if (g.price > 0 && !g.stripeUrl) return;
  if (g.stripeUrl) { window.open(g.stripeUrl + '?quantity=' + state.qty, '_blank'); return; }
  openRSVP({ eventId: g.id, title: g.title, guests: state.qty, onSuccess: () => { state.purchased = true; render(); } });
}

window.addEventListener('hashchange', () => { closeRSVP(); render(); });
window.addEventListener('scroll', syncNavScroll, { passive: true });

/* ------------------------------------------------------------- bootstrap */
async function init() {
  render(); // paint immediately with empty data (fallbacks fill in)
  const [events, voices, photos] = await Promise.all([loadEvents(), loadVoices(), loadPhotos()]);
  state.events = events;
  state.voices = voices;
  state.photos = photos;
  state.loaded = true;
  render(); // re-render with data
}

init();
