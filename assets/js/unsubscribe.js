// The /unsubscribe page. Two modes, chosen by whether the URL carries a token:
//   ?t=<token>  — the personal link from a newsletter. We look up who it is and
//                 ask for one confirming click.
//   no token    — the fallback: type the address, guarded by Turnstile.
//
// Nothing opts out on page load. Scanners and prefetchers follow links inside
// email, so the opt-out only happens on an explicit POST from the button.
const TURNSTILE_SITEKEY = '0x4AAAAAAEOiex7_1tN6hBFC';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const view = document.getElementById('view');
const token = new URLSearchParams(location.search).get('t') || '';

function ensureTurnstile(cb) {
  if (window.turnstile) return cb(true);
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true; s.defer = true;
  s.onload = () => cb(true);
  s.onerror = () => cb(false);
  document.head.appendChild(s);
}

const done = (msg) => {
  view.innerHTML = `<h1 class="u-title">You're unsubscribed</h1>
    <p class="u-lead">${esc(msg)}</p>
    <p class="u-fine">Changed your mind? You can sign up again any time from
      <a href="/">the website</a>.</p>`;
};

const failed = (msg) => {
  const p = document.createElement('p');
  p.className = 'u-err';
  p.textContent = msg;
  view.appendChild(p);
};

async function post(payload) {
  const r = await fetch('/api/unsubscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || !d.ok) throw new Error((d && d.error) || 'HTTP ' + r.status);
  return d;
}

/* ---- token mode ---------------------------------------------------------- */
async function tokenMode() {
  let who = null;
  try {
    const r = await fetch('/api/unsubscribe?t=' + encodeURIComponent(token));
    if (r.ok) who = await r.json();
  } catch { /* fall through to the generic prompt below */ }

  if (who && who.status === 'unsubscribed') {
    done('That address is already off the newsletter list.');
    return;
  }

  const label = who && who.emailMasked ? who.emailMasked : 'this address';
  view.innerHTML = `
    <h1 class="u-title">Unsubscribe?</h1>
    <p class="u-lead">We'll stop sending the newsletter to <b>${esc(label)}</b>.
      You'll still be welcome at every gathering.</p>
    <button type="button" class="u-btn" id="go">Yes, unsubscribe me</button>
    <p class="u-fine"><a href="/">No thanks, take me back</a></p>`;

  document.getElementById('go').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Unsubscribing…';
    try {
      await post({ token });
      done("You're off the list. No more newsletters.");
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Yes, unsubscribe me';
      failed("That didn't go through: " + err.message);
    }
  });
}

/* ---- email mode ---------------------------------------------------------- */
function emailMode() {
  view.innerHTML = `
    <h1 class="u-title">Unsubscribe</h1>
    <p class="u-lead">Enter the email address you signed up with and we'll take
      it off the newsletter list.</p>
    <form id="f" novalidate>
      <label class="u-label" for="email">Email address</label>
      <input class="u-input" type="email" id="email" name="email" required
             autocomplete="email" placeholder="you@example.com">
      <div id="ts" class="u-ts"></div>
      <button type="submit" class="u-btn" id="go">Unsubscribe me</button>
    </form>
    <p class="u-fine"><a href="/">Back to the website</a></p>`;

  let widget = null;
  ensureTurnstile((ok) => {
    if (!ok || !window.turnstile) return;
    widget = window.turnstile.render(document.getElementById('ts'), {
      sitekey: TURNSTILE_SITEKEY,
      theme: 'dark',
    });
  });

  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const btn = document.getElementById('go');
    if (!email) return failed('Please enter your email address.');

    let tsToken = '';
    if (window.turnstile && widget != null) {
      try { tsToken = window.turnstile.getResponse(widget) || ''; } catch { /* not ready */ }
    }

    btn.disabled = true; btn.textContent = 'Unsubscribing…';
    try {
      await post({ email, turnstileToken: tsToken });
      // Deliberately the same message whether or not the address was on the
      // list — otherwise this page would reveal who is subscribed.
      done("If that address was on our list, it's been removed.");
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Unsubscribe me';
      if (window.turnstile && widget != null) { try { window.turnstile.reset(widget); } catch {} }
      failed("That didn't go through: " + err.message);
    }
  });
}

if (token) tokenMode(); else emailMode();
