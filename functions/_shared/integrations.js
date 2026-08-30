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

// Posts a payload to an Apps Script web app. Never throws: a Sheet problem must
// not fail the caller's request, because the row is already safe in D1.
export async function postToAppsScript(url, payload, sharedToken) {
  if (!url) return { synced: false, reason: 'no_url' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, token: sharedToken || '' }),
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
