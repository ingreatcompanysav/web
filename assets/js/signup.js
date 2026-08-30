// Newsletter signup form, shared by the home page and the links page.
//
// mountSignup(el, { source }) replaces el's contents with the form and wires it
// to POST /api/subscribe. `source` is recorded with the subscriber so the client
// can see which form someone came through.
const TURNSTILE_SITEKEY = '0x4AAAAAAEOiex7_1tN6hBFC';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function ensureTurnstile(cb) {
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

let seq = 0; // unique ids, so two forms on one page keep their labels straight

export function mountSignup(el, { source = '' } = {}) {
  if (!el) return;
  const n = ++seq;
  el.innerHTML = `
    <form class="signup" novalidate>
      <div class="signup__row">
        <div class="signup__field">
          <label class="signup__label" for="su-first-${n}">First name</label>
          <input class="signup__input" id="su-first-${n}" name="firstName" type="text"
                 autocomplete="given-name" required placeholder="Danielle">
        </div>
        <div class="signup__field">
          <label class="signup__label" for="su-last-${n}">Last name</label>
          <input class="signup__input" id="su-last-${n}" name="lastName" type="text"
                 autocomplete="family-name" placeholder="Meier">
        </div>
      </div>
      <div class="signup__field">
        <label class="signup__label" for="su-email-${n}">Email address</label>
        <input class="signup__input" id="su-email-${n}" name="email" type="email"
               autocomplete="email" required placeholder="you@example.com">
      </div>
      <div class="signup__ts"></div>
      <button class="signup__btn" type="submit">Sign me up</button>
      <p class="signup__msg" role="status" aria-live="polite"></p>
      <p class="signup__fine">We send the occasional note about what's coming up.
        Unsubscribe any time — every email has a link.</p>
    </form>`;

  const form = el.querySelector('form');
  const msg = el.querySelector('.signup__msg');
  const btn = el.querySelector('.signup__btn');
  const tsBox = el.querySelector('.signup__ts');

  let widget = null;
  ensureTurnstile((ok) => {
    if (!ok || !window.turnstile) return;
    widget = window.turnstile.render(tsBox, { sitekey: TURNSTILE_SITEKEY, theme: 'dark' });
  });

  const say = (text, kind) => {
    msg.textContent = text || '';
    msg.className = 'signup__msg' + (kind ? ' signup__msg--' + kind : '');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const firstName = String(data.firstName || '').trim();
    const email = String(data.email || '').trim();
    if (!firstName) return say('Please tell us your first name.', 'err');
    if (!email) return say('Please enter your email address.', 'err');

    let tsToken = '';
    if (window.turnstile && widget != null) {
      try { tsToken = window.turnstile.getResponse(widget) || ''; } catch { /* not ready */ }
    }

    btn.disabled = true; btn.textContent = 'Signing you up…'; say('');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName: String(data.lastName || '').trim(),
          email,
          source,
          turnstileToken: tsToken,
        }),
      });
      const out = await r.json().catch(() => null);
      if (!r.ok || !out || !out.ok) throw new Error((out && out.error) || 'HTTP ' + r.status);

      el.innerHTML = `<div class="signup__done">
        <h3 class="signup__done-title">${out.alreadySubscribed ? "You're already on the list" : "You're on the list"}</h3>
        <p class="signup__done-lead">${out.alreadySubscribed
          ? `We already had ${esc(email)} — nothing else to do.`
          : `We'll write to ${esc(email)} when there's something worth knowing.`}</p>
      </div>`;
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Sign me up';
      if (window.turnstile && widget != null) { try { window.turnstile.reset(widget); } catch {} }
      say(friendly(err.message), 'err');
    }
  });
}

// Endpoint error codes are for us, not for a person reading a form.
function friendly(code) {
  if (code === 'email_invalid') return "That email doesn't look quite right — mind checking it?";
  if (code === 'email_required') return 'Please enter your email address.';
  if (code === 'first_name_required') return 'Please tell us your first name.';
  if (code === 'turnstile_failed') return "The spam check didn't pass. Please try once more.";
  return "That didn't go through. Please try again in a moment.";
}
