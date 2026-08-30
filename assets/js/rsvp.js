// In Great Company — RSVP modal. Ported from the original in-bundle script into
// a module. openRSVP({ eventId, title, onSuccess }) opens it; posts to /api/rsvp.
// Turnstile renders only when a real site key is set.

const TURNSTILE_SITEKEY = '0x4AAAAAAEOiex7_1tN6hBFC';
const hasTurnstile = TURNSTILE_SITEKEY && TURNSTILE_SITEKEY.indexOf('REPLACE_') !== 0;

const INK = '#0A4247', ROSE = '#EF2E9F', CREAM = '#FFFAF0', LINE = 'rgba(10,66,71,.18)';
const INK_ON_ROSE = '#03191B';   // deep ink on the rose submit button — WCAG AA
const ROSE_TEXT = '#A3186A';     // darker rose for error text on the cream card
let el = null, tokenEl = null, token = '', tsWidget = null, current = null, lastFocused = null;

const isOpen = () => el && el.style.display === 'flex';

// Keep Tab inside the dialog while it's open.
function focusable() {
  return Array.from(el.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])'
  )).filter((n) => n.offsetParent !== null);
}
function trapTab(e) {
  const f = focusable();
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function ensureTurnstile(cb) {
  if (!hasTurnstile) return cb(false);
  if (window.turnstile) return cb(true);
  if (window.__igcTsLoading) {
    const iv = setInterval(() => { if (window.turnstile) { clearInterval(iv); cb(true); } }, 100);
    setTimeout(() => { clearInterval(iv); if (!window.turnstile) cb(false); }, 8000);
    return;
  }
  window.__igcTsLoading = true;
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true; s.defer = true;
  s.onload = () => cb(true);
  s.onerror = () => cb(false);
  document.head.appendChild(s);
}

const inp = () =>
  'width:100%;font:inherit;font-size:15px;color:' + INK + ';border:1px solid ' + LINE +
  ';border-radius:9px;padding:10px 11px;background:#fff;';

const field = (k, label, control) =>
  '<label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:rgba(10,66,71,.75)">' +
  '<span>' + label + '</span>' + control + '</label>';

function build() {
  el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(10,66,71,.55)';
  el.innerHTML =
    '<div role="dialog" aria-modal="true" aria-labelledby="igc-rsvp-title" style="background:' + CREAM + ';color:' + INK + ';width:100%;max-width:440px;border-radius:18px;box-shadow:0 20px 60px rgba(10,66,71,.35);overflow:hidden;font-family:Montserrat,-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif">' +
      '<div style="padding:20px 22px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:12px">' +
        '<div><div id="igc-rsvp-title" style="font-family:\'Playfair Display\',Georgia,serif;font-size:22px;font-weight:600">Save your seat</div>' +
        '<div data-igc="sub" style="font-size:13px;opacity:.7;margin-top:2px"></div></div>' +
        '<button type="button" data-igc="close" aria-label="Close" style="border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;color:' + INK + '">&times;</button>' +
      '</div>' +
      '<form data-igc="form" style="padding:16px 22px 22px;display:flex;flex-direction:column;gap:12px">' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
          '<div style="flex:1 1 140px;min-width:0">' +
            field('firstName', 'First name', '<input required name="firstName" type="text" autocomplete="given-name" style="' + inp() + '">') +
          '</div>' +
          '<div style="flex:1 1 140px;min-width:0">' +
            field('lastName', 'Last name', '<input name="lastName" type="text" autocomplete="family-name" style="' + inp() + '">') +
          '</div>' +
        '</div>' +
        field('email', 'Email <span style=\'font-weight:400;opacity:.6\'>(optional)</span>', '<input name="email" type="email" autocomplete="email" style="' + inp() + '">') +
        field('guests', 'How many of you?', '<input name="guests" type="number" min="1" max="6" step="1" value="1" style="' + inp() + '">') +
        field('note', 'Anything to add? <span style=\'font-weight:400;opacity:.6\'>(optional)</span>', '<textarea name="note" rows="2" style="' + inp() + 'resize:vertical"></textarea>') +
        '<div data-igc="ts" style="min-height:0"></div>' +
        '<div data-igc="msg" style="font-size:13px;min-height:18px"></div>' +
        '<button type="submit" data-igc="submit" style="border:0;background:' + ROSE + ';color:' + INK_ON_ROSE + ';font:inherit;font-weight:600;font-size:15px;padding:12px;border-radius:10px;cursor:pointer">Send RSVP</button>' +
        '<p style="font-size:11px;line-height:1.5;text-align:center;margin:0;color:' + INK + ';opacity:.6">By RSVPing, you confirm you’re 21 or older and agree we can email you about this event. We never sell your info. <a href="#privacy" style="color:inherit">Privacy Policy</a></p>' +
      '</form>' +
    '</div>';
  document.body.appendChild(el);

  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.getAttribute('data-igc') === 'close') close();
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') trapTab(e);
  });
  el.querySelector('[data-igc="form"]').addEventListener('submit', submit);
  tokenEl = el.querySelector('[data-igc="ts"]');
}

function setMsg(text, ok) {
  const m = el.querySelector('[data-igc="msg"]');
  m.textContent = text || '';
  m.style.color = ok ? '#116769' : ROSE_TEXT;
}

export function openRSVP(opts) {
  current = opts || {};
  lastFocused = document.activeElement;
  if (!el) build();
  token = '';
  el.querySelector('[data-igc="form"]').reset();
  const guests = Math.max(1, Math.min(6, parseInt(current.guests, 10) || 1));
  el.querySelector('[name="guests"]').value = String(guests);
  setMsg('');
  el.querySelector('[data-igc="sub"]').textContent = current.title ? ('for ' + current.title) : '';
  el.querySelector('[data-igc="submit"]').disabled = false;
  el.style.display = 'flex';
  el.setAttribute('aria-hidden', 'false');
  setTimeout(() => { const n = el.querySelector('[name="firstName"]'); if (n) n.focus(); }, 30);

  if (hasTurnstile) {
    tokenEl.innerHTML = '';
    ensureTurnstile((okTs) => {
      if (!okTs || !window.turnstile) return;
      tsWidget = window.turnstile.render(tokenEl, {
        sitekey: TURNSTILE_SITEKEY,
        callback: (t) => { token = t; }
      });
    });
  }
}

function close() {
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
  if (hasTurnstile && window.turnstile && tsWidget != null) {
    try { window.turnstile.reset(tsWidget); } catch {}
  }
  if (lastFocused && typeof lastFocused.focus === 'function') {
    try { lastFocused.focus(); } catch {}
  }
  lastFocused = null;
}

export const closeRSVP = close;

function submit(e) {
  e.preventDefault();
  const form = e.target;
  const val = (k) => (form.querySelector('[name="' + k + '"]').value || '').trim();
  const firstName = val('firstName');
  if (!firstName) { setMsg('Please add your first name.'); return; }
  if (hasTurnstile && !token) { setMsg('Please complete the “I’m human” check.'); return; }
  const btn = el.querySelector('[data-igc="submit"]');
  btn.disabled = true; setMsg('Sending…', true);
  fetch('/api/rsvp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventId: current.eventId || '',
      firstName,
      lastName: val('lastName'),
      email: val('email'),
      guests: parseInt(val('guests'), 10) || 1,
      note: val('note'),
      turnstileToken: token
    })
  })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
    .then((res) => {
      if (res.ok && res.j && res.j.ok) {
        setMsg('You’re on the list — see you there! 💛', true);
        if (typeof current.onSuccess === 'function') { try { current.onSuccess(); } catch {} }
        setTimeout(close, 1400);
      } else {
        btn.disabled = false;
        setMsg('Sorry — that didn’t go through. Please try again.');
      }
    })
    .catch(() => { btn.disabled = false; setMsg('Sorry — that didn’t go through. Please try again.'); });
}
