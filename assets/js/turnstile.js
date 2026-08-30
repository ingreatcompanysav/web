// Cloudflare Turnstile, in one place.
//
// Three forms need a challenge (RSVP, newsletter signup, unsubscribe-by-email)
// and each used to carry its own copy of the site key and its own loader — one
// of which raced against the others through a `window.__igcTsLoading` flag and
// a 100ms polling interval. A single module-scoped promise does that properly:
// the first caller starts the script, everyone else awaits the same promise.
export const TURNSTILE_SITEKEY = '0x4AAAAAAEOiex7_1tN6hBFC';

let loading = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return loading;
}

// Renders a widget into `box` and returns a handle, or null if Turnstile could
// not load. A null handle is not fatal: the caller submits with an empty token
// and the endpoint decides — it skips verification entirely when no secret is
// configured, which is what makes local dev work.
export async function mountTurnstile(box, opts = {}) {
  if (!(await loadScript()) || !window.turnstile) return null;
  const id = window.turnstile.render(box, { sitekey: TURNSTILE_SITEKEY, ...opts });
  return {
    token() {
      try { return window.turnstile.getResponse(id) || ''; } catch { return ''; }
    },
    reset() {
      try { window.turnstile.reset(id); } catch { /* widget already gone */ }
    },
    // Turnstile keeps its own registry keyed by this id, so a widget whose
    // container has been thrown away is still live to it — the console fills
    // with "Cannot find Widget" once a few have piled up. Callers that discard
    // the container must say so.
    remove() {
      try { window.turnstile.remove(id); } catch { /* widget already gone */ }
    },
  };
}
