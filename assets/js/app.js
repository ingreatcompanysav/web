// In Great Company — client app. Recreates the original SPA (routes: home,
// gatherings, event, story, join) as modular, data-driven views.
import { loadEvents, loadVoices, loadPhotos } from './api.js';
import { AVATAR_BY_NAME, VALUES, REASONS, LINKS } from './data.js';
import { openRSVP, closeRSVP } from './rsvp.js';

/* ----------------------------------------------------------------- helpers */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const scriptWord = (word, xl) => `<span class="igc-script${xl ? ' igc-script--xl' : ''}">${esc(word)}</span>`;

/* --------------------------------------------------------------- components */
function sectionHeading({ eyebrow, title, script, description, center, size }) {
  const xl = size === 'xl';
  const cls = ['section-heading'];
  if (center) cls.push('section-heading--center');
  if (xl) cls.push('section-heading--xl');
  return `<header class="${cls.join(' ')}">
    ${eyebrow ? `<div class="igc-eyebrow section-heading__eyebrow">${esc(eyebrow)}</div>` : ''}
    <h2 class="section-heading__title">${esc(title)}${script ? scriptWord(script, xl) : ''}</h2>
    ${description ? `<p class="section-heading__desc">${esc(description)}</p>` : ''}
  </header>`;
}

function button({ label, variant = 'default', size, full, action, id }) {
  const cls = ['btn', `btn--${variant}`];
  if (size) cls.push(`btn--${size}`);
  if (full) cls.push('btn--full');
  return `<button type="button" class="${cls.join(' ')}"${action ? ` data-action="${action}"` : ''}${id ? ` data-id="${esc(id)}"` : ''}>${esc(label)}</button>`;
}

function tag(label, { tone, outlined } = {}) {
  const cls = ['tag'];
  if (outlined) cls.push('tag--outlined');
  if (tone) cls.push(`tag--${tone}`);
  return `<span class="${cls.join(' ')}">${esc(label)}</span>`;
}

const statusOf = (g) => (g.price ? `$${g.price} · tickets` : null);

function eventCard(g, row) {
  const status = statusOf(g);
  const meta = [g.date, g.time, row ? g.place : null].filter(Boolean).join(' · ');
  return `<button type="button" class="event-card${row ? ' event-card--row' : ''}" data-action="open-event" data-id="${esc(g.id)}">
    <div class="event-card__media">
      ${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.title)}" loading="lazy">` : `<span class="event-card__note">${esc(g.note || '')}</span>`}
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
    <h3 class="ticket__head">${esc(o.priceHead)}</h3>
    <p class="ticket__note">${esc(o.priceNote)}</p>
    <div class="seats">
      <span class="seats__label">Seats</span>
      <div class="seats__ctrls">
        <button type="button" class="seats__btn" aria-label="One fewer seat" data-action="dec-qty">−</button>
        <span class="seats__qty">${o.qty}</span>
        <button type="button" class="seats__btn" aria-label="One more seat" data-action="inc-qty">+</button>
      </div>
    </div>
    <div class="ticket__total"><span class="ticket__total-label">Total</span><span class="ticket__total-val">${esc(o.total)}</span></div>
    <div class="ticket__actions">${button({ label: o.cta, size: 'lg', full: true, action: 'buy' })}</div>
    <p class="ticket__fine">Secure checkout — card, Apple Pay, or Google Pay. Refunds up to 48 hours before, no explanation needed.</p>`;
}

function ticketConfirmed(line) {
  return `
    <div class="igc-eyebrow" style="color:var(--brand-primary)">Your seat is saved</div>
    <h3 class="ticket__head">See you there. 💛</h3>
    <p class="ticket__note" style="margin-top:var(--space-4)">${esc(line)} We'll send the details a few days before — and if plans change, no explanation needed.</p>
    <div class="ticket__confirm-actions">
      ${button({ label: 'Add To Calendar', variant: 'outline', full: true, action: 'add-calendar' })}
      ${button({ label: 'Bring Someone Else Too', variant: 'ghost', full: true, action: 'reset-purchase' })}
    </div>`;
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
const NAV = [['home', 'Home'], ['gatherings', 'Gatherings'], ['story', 'Our Story'], ['join', 'Join Us']];

function navBar(active) {
  const links = NAV.map(([r, l]) =>
    `<button class="nav__link${active === r ? ' is-active' : ''}" data-nav="${r}">${l}</button>`).join('');
  return `<nav class="nav" id="nav">
    <button class="nav__logo" data-nav="home" aria-label="In Great Company — home"><img src="/assets/img/logo-cream.png" alt="In Great Company"></button>
    <div class="nav__links">${links}${button({ label: 'Save My Seat', size: 'sm', action: 'go-join' })}</div>
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
        <button class="footer__link" data-nav="story" style="text-align:left;background:none;border:0;cursor:pointer">Our Story</button>
        <button class="footer__link" data-nav="join" style="text-align:left;background:none;border:0;cursor:pointer">Join Us</button>
      </div>
      <div class="footer__col">
        <span class="igc-eyebrow footer__head">Say hi</span>
        <a class="footer__link" href="${LINKS.instagram}" target="_blank" rel="noopener noreferrer">@ingreatcompanysav</a>
        <a class="footer__link" href="${LINKS.facebook}" target="_blank" rel="noopener noreferrer">Facebook Group</a>
        <a class="footer__link" href="${LINKS.email}">${LINKS.emailText}</a>
      </div>
    </div>
    <div class="footer__bar"><span>Savannah, Georgia</span><span>Women first, always.</span></div>
  </footer>`;
}

/* ---------------------------------------------------------------- views */
function homeView(state) {
  const featured = state.events.slice(0, 3);
  return `
  <section class="hero">
    <div class="hero__grid">
      <div>
        <div class="igc-eyebrow">A women's social group · Savannah, GA</div>
        <h1 class="hero__title">Every woman deserves a place to<br>${scriptWord('belong.', true)}</h1>
        <p class="hero__lead">New to Savannah, starting a new chapter, or just craving real friendship — there's a seat here for you. No pressure, no judgment, just women showing up for each other.</p>
        <div class="hero__actions">
          ${button({ label: "See What's Coming Up", size: 'lg', action: 'go-gatherings' })}
          ${button({ label: 'Come Say Hi', variant: 'outline', size: 'lg', action: 'go-join' })}
        </div>
        <div class="hero__tags">
          ${tag('All ages', { outlined: true })}${tag('Come alone', { outlined: true })}${tag('Bring a friend', { outlined: true })}${tag('No small talk required', { outlined: true })}
        </div>
      </div>
      <div class="hero__media"><img src="${esc(state.photos.hero || '/assets/img/photo-hero.jpg')}" alt="In Great Company members laughing together on a sailboat in Savannah"></div>
    </div>
  </section>

  <section class="section section--page">
    <div class="container">
      <div class="section-head">
        ${sectionHeading({ eyebrow: 'Follow along', title: 'The everyday, as it happens', script: 'here', size: 'xl', description: 'Instagram is where we live day to day. The site keeps it all in one place — the feed, the newsletter, and the calendar.' })}
        <div class="cluster">
          ${button({ label: '@ingreatcompanysav', variant: 'outline', action: 'open-instagram' })}
          ${button({ label: 'Facebook Group', variant: 'outline', action: 'open-facebook' })}
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

  <section class="section section--page">
    <div class="container split split--story">
      <div class="media-frame media-frame--square"><img src="${esc(state.photos.story || '/assets/img/photo-story.jpg')}" alt="Two In Great Company members smiling together on a night out"></div>
      <div>
        ${sectionHeading({ eyebrow: "Why we're here", title: 'Connection that', script: 'lasts' })}
        <p class="prose-lead">We come together to explore the city we love, from hidden gems to old favorites, over coffee, long dinners, and slow Sunday mornings — and to build the kind of friendships you keep for a lifetime.</p>
      </div>
    </div>
  </section>

  <section class="section section--sunk">
    <div class="container">
      ${sectionHeading({ center: true, size: 'xl', eyebrow: 'In their words', title: 'Women who came alone', script: 'once' })}
      <div class="grid-3 mt-8">${state.voices.map(quoteCard).join('')}</div>
    </div>
  </section>

  <section class="section section--rose">
    <div class="cta-band">
      <h2 class="cta-band__title">Come as you are.<br>You're in great company. 💛</h2>
      <p class="cta-band__lead">Tell us a little about yourself and we'll let you know when the next gathering goes up.</p>
      <div class="cta-band__actions">${button({ label: 'Save My Seat', variant: 'inverse', size: 'lg', action: 'go-join' })}</div>
    </div>
  </section>`;
}

function gatheringsView(state) {
  return `
  <section class="section" style="background:var(--wash-golden);padding:72px var(--gutter-lg) 64px">
    <div class="container">
      ${sectionHeading({ eyebrow: 'Gatherings', title: "What's on the calendar", script: 'soon', description: 'Free unless it says otherwise. Tickets hold your seat and cover the table.' })}
    </div>
  </section>
  <section class="section section--page" style="padding:var(--space-9) var(--gutter-lg) var(--section-y)">
    <div class="container" style="display:flex;flex-direction:column;gap:var(--space-5)">
      ${state.events.map((g) => eventCard(g, true)).join('')}
    </div>
  </section>`;
}

function eventView(state) {
  const g = state.events.find((e) => e.id === state.eventId) || state.events[0];
  if (!g) return placeholderView('Gathering details', 'That gathering could not be found.');
  const price = g.price;
  const meta = [g.date, g.time, g.place].filter(Boolean).join(' · ');
  const total = price ? `$${price * state.qty}` : 'Free';
  const panel = state.purchased
    ? ticketConfirmed(price ? `Receipt for ${total} is on its way to your inbox.` : `We’ve got you down for ${state.qty}.`)
    : ticketBuy({
        priceLabel: price ? 'Tickets' : 'Free to come',
        priceHead: price ? `$${price} a seat` : 'Just tell us you’re coming',
        priceNote: price
          ? 'Your ticket covers the table and holds your seat. Checkout is handled by Stripe.'
          : 'No ticket, no charge. We just like to know how many chairs to pull up.',
        qty: state.qty, total, cta: price ? 'Get My Ticket' : 'Save My Seat'
      });
  return `
  <section class="section section--page" style="padding:var(--space-8) var(--gutter-lg) var(--section-y)">
    <div class="container">
      <button class="back-link" data-action="go-gatherings">← All gatherings</button>
      <div class="event-detail">
        <div>
          <div class="event-detail__media">${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.title)}">` : `<span class="event-detail__note">${esc(g.note || '')}</span>`}</div>
          <div class="igc-eyebrow event-detail__meta">${esc(meta)}</div>
          <h1 class="event-detail__title">${esc(g.title)}</h1>
          <p class="event-detail__prose">${esc(g.blurb || '')}</p>
          ${g.detail ? `<p class="event-detail__prose" style="margin-top:0">${esc(g.detail)}</p>` : ''}
          <div class="event-detail__tags">
            ${tag('Come alone', { tone: 'cyan' })}
            ${tag('Street parking nearby', { outlined: true })}
            ${tag('We’ll be at the long table', { outlined: true })}
          </div>
        </div>
        <aside class="ticket">${panel}</aside>
      </div>
    </div>
  </section>`;
}

function storyView() {
  return `
  <section class="story-hero">
    <div class="story-hero__inner">
      <div class="igc-eyebrow">Our story</div>
      <h1 class="story-hero__title">It started with one table and four women who didn't know each other</h1>
      <p class="story-hero__lead">Making friends as a grown woman is strange and hard. Everyone is busy, everyone already has people, and nobody wants to be the one who asks. So we asked.</p>
    </div>
  </section>
  <section class="section section--page">
    <div class="container grid-3">
      ${VALUES.map((v) => `<div class="card"><h3 class="card__title">${esc(v.title)}</h3><p class="card__body">${esc(v.body)}</p></div>`).join('')}
    </div>
  </section>
  <section class="section section--deep">
    <div class="quote-band">
      <p class="quote-band__text">I walked in not knowing a soul and left with three numbers in my phone and dinner plans on Thursday.</p>
      <p class="quote-band__cite">Marisol · came alone in March</p>
    </div>
  </section>`;
}

function joinView(state) {
  return `
  <section class="section section--page" style="padding:72px var(--gutter-lg) var(--section-y)">
    <div class="container join">
      <div>
        ${sectionHeading({ eyebrow: 'Join us', title: 'There’s a seat here for', script: 'you', description: 'No application, no vetting, no fee. Tell us where to send the invitations and we’ll do the rest.' })}
        <div class="join__media"><img src="${esc(state.photos.join || '/assets/img/photo-join.jpg')}" alt="Photo booth strips from an In Great Company gathering"></div>
      </div>
      <form class="form-card" data-join-form novalidate>
        <div class="field">
          <label class="field__label" for="j-name">First name</label>
          <input class="field__control" id="j-name" name="name" type="text" placeholder="Rae" autocomplete="given-name">
        </div>
        <div class="field">
          <label class="field__label" for="j-email">Email</label>
          <input class="field__control" id="j-email" name="email" type="email" placeholder="rae@email.com" autocomplete="email">
          <span class="field__hint">We send one note a week, on Sundays.</span>
        </div>
        <div class="field">
          <label class="field__label" for="j-reason">What brought you here?</label>
          <select class="field__control" id="j-reason" name="reason">${REASONS.map((r) => `<option value="${esc(r.value)}">${esc(r.label)}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label class="field__label" for="j-note">Anything you'd love us to plan?</label>
          <textarea class="field__control" id="j-note" name="note" placeholder="A bookish thing. A long walk. Somewhere quiet enough to actually talk."></textarea>
        </div>
        <label class="checkfield"><input type="checkbox" name="remind"><span>Text me when a gathering is a day away</span></label>
        <p class="form-note" data-join-msg></p>
        ${button({ label: 'Save My Seat', size: 'lg', full: true, action: 'join-submit' })}
        <p class="form-note">Come as you are. You're in great company. 💛</p>
      </form>
    </div>
  </section>`;
}

// Fallback only (event id that no longer exists).
function placeholderView(title, sub) {
  return `<section class="section section--page" style="min-height:52vh;display:grid;place-items:center">
    <div class="container" style="text-align:center">
      ${sectionHeading({ center: true, eyebrow: 'Not found', title, script: 'sorry' })}
      <p class="prose-lead" style="margin-left:auto;margin-right:auto">${esc(sub)}</p>
    </div>
  </section>`;
}

/* ---------------------------------------------------------------- router */
const state = { route: 'home', events: [], voices: [], photos: {}, eventId: null, qty: 1, purchased: false };

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
    case 'story': return storyView();
    case 'join': return joinView(state);
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
    case 'go-join': go('join'); break;
    case 'go-story': go('story'); break;
    case 'open-instagram': window.open(LINKS.instagram, '_blank', 'noopener'); break;
    case 'open-facebook': window.open(LINKS.facebook, '_blank', 'noopener'); break;
    case 'open-event': location.hash = `#event/${id}`; break;
    case 'inc-qty': state.qty = Math.min(6, state.qty + 1); render(); break;
    case 'dec-qty': state.qty = Math.max(1, state.qty - 1); render(); break;
    case 'reset-purchase': state.purchased = false; state.qty = 1; render(); break;
    case 'buy': buyCurrent(); break;
    case 'add-calendar': break; // TODO Phase 3: generate an .ics / calendar link
    case 'join-submit': e.preventDefault(); submitJoin(); break;
    default: break;
  }
});

// A gathering with a stripeUrl goes to Stripe; otherwise open the RSVP modal.
function buyCurrent() {
  const g = state.events.find((e) => e.id === state.eventId) || state.events[0];
  if (!g) return;
  if (g.stripeUrl) { window.open(g.stripeUrl + '?quantity=' + state.qty, '_blank'); return; }
  openRSVP({ eventId: g.id, title: g.title, onSuccess: () => { state.purchased = true; render(); } });
}

// The join list is a mailing-list signup. TODO Phase 3: POST to a list endpoint.
function submitJoin() {
  const form = document.querySelector('[data-join-form]');
  if (!form) return;
  const name = (form.querySelector('[name=name]').value || '').trim();
  const msg = form.querySelector('[data-join-msg]');
  if (!name) { if (msg) { msg.textContent = 'Please add your first name.'; msg.style.color = 'var(--brand-primary)'; } return; }
  if (msg) { msg.textContent = 'You’re on the list — see you soon. 💛'; msg.style.color = 'var(--cyan-300)'; }
  const btn = form.querySelector('[data-action=join-submit]');
  if (btn) btn.setAttribute('disabled', 'true');
}

document.addEventListener('submit', (e) => {
  if (e.target.matches('[data-join-form]')) { e.preventDefault(); submitJoin(); }
});

window.addEventListener('hashchange', () => { closeRSVP(); render(); });
window.addEventListener('scroll', syncNavScroll, { passive: true });

/* ------------------------------------------------------------- bootstrap */
async function init() {
  render(); // paint immediately with empty data (fallbacks fill in)
  const [events, voices, photos] = await Promise.all([loadEvents(), loadVoices(), loadPhotos()]);
  state.events = events;
  state.voices = voices;
  state.photos = photos;
  render(); // re-render with data
}

init();
