// The /links page — a Linktree-style card of outbound links, edited from the
// admin page's Links tab and served by /api/links.
//
// Standalone: it does not boot the SPA in app.js, only shares the design
// tokens. The static LINKS object is the fallback when the API is unavailable
// (previewing the files without the Pages Functions runtime, or a cold DB).
import { LINKS } from './data.js';
import { mountSignup } from './signup.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Inline SVG so each mark takes the surrounding text colour — no icon font,
   no extra request. Keys match the `icon` column; see db/schema.sql. */
const ICONS = {
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.01 3.66 9.17 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.45 2.91h-2.33V22c4.78-.77 8.44-4.93 8.44-9.94Z"/></svg>`,
  email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.6" y="4.6" width="18.8" height="14.8" rx="2.6"/><path d="m3.6 7.4 8.4 5.8 8.4-5.8"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="3.2" y="5" width="17.6" height="16" rx="3"/><path d="M3.2 10h17.6M8 3v4M16 3v4"/></svg>`,
  ticket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5v-2Z"/><path d="M14 6v12" stroke-dasharray="2 2.6"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.2-4.6-7.2-9.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.2 2.9C19.2 15.4 12 20 12 20Z"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l2.9-2.9a3.6 3.6 0 0 0-5.1-5.1l-1.2 1.2"/><path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-2.9 2.9a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2"/></svg>`,
};

const TONES = ['rose', 'cyan', 'gold', 'cream'];

// Shown when the API can't be reached — mirrors the site footer.
const FALLBACK = [
  { label: 'Follow us on Instagram', url: LINKS.instagram, subtitle: '@ingreatcompanysav', icon: 'instagram', tone: 'rose' },
  { label: 'Join the Facebook group', url: LINKS.facebook, subtitle: 'Where the day-to-day chatter happens', icon: 'facebook', tone: 'cyan' },
  { label: 'See upcoming gatherings', url: '/#gatherings', subtitle: 'Coffee, dinners, walks — all of it', icon: 'calendar', tone: 'gold' },
  { label: 'Email us', url: LINKS.email, subtitle: LINKS.emailText, icon: 'email', tone: 'cream' },
];

// mailto:/tel: stay in place; everything off-site opens in a new tab.
const isExternal = (url) => /^https?:\/\//i.test(url);

function linkRow(l, i) {
  const tone = TONES.includes(l.tone) ? l.tone : 'rose';
  const mark = ICONS[l.icon] || ICONS.link;
  const target = isExternal(l.url) ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<li class="link-item" style="--i:${i}">
    <a class="link-btn link-btn--${tone}" href="${esc(l.url)}"${target}>
      <span class="link-btn__icon" aria-hidden="true">${mark}</span>
      <span class="link-btn__text">
        <span class="link-btn__label">${esc(l.label)}</span>
        ${l.subtitle ? `<span class="link-btn__sub">${esc(l.subtitle)}</span>` : ''}
      </span>
      <span class="link-btn__chev" aria-hidden="true">→</span>
    </a>
  </li>`;
}

// Returns null only when the API could not be reached — an empty array is a
// real answer (the client turned every link off) and must not resurrect the
// FALLBACK list, or hiding everything would look broken from the admin side.
async function loadLinks() {
  try {
    const r = await fetch('/api/links', { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d : null;
  } catch {
    return null;
  }
}

async function init() {
  const list = document.getElementById('links');
  const links = (await loadLinks()) || FALLBACK;
  list.innerHTML = links.map(linkRow).join('');
  mountSignup(document.getElementById('signup'), { source: 'links' });
}

init();
