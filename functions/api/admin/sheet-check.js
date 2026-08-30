// GET /api/admin/sheet-check?type=rsvps|subscribers
//
// Isolates "can we reach the Apps Script at all?" from "did the sync work?".
// Both scripts expose a doGet() health check that returns
// {ok:true, service:'igc-rsvp'|'igc-newsletter'}, so a plain GET tells us:
//
//   json + service   -> deployment is public and the URL is right
//   html + 403/401   -> "Who has access" is not "Anyone" (Google serves its
//                       sign-in page instead of running the script)
//   html + 200       -> a login/redirect page; usually a /dev URL or a
//                       deployment that needs authorisation
//
// This does NOT prove the shared token matches — a wrong token fails the POST
// with script_rejected, which is a different (and clearer) error.
import { json } from '../../_shared/db.js';

// Host + deployment-ID fragment. Never the whole URL: it is a capability, and
// anyone holding it can append rows. The fragment is short enough to be useless
// on its own but long enough to match against the Manage Deployments list.
function fingerprint(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const tail = parts[parts.length - 1] || '(no path)';
    const id = parts.length >= 3 ? parts[parts.length - 2] : '';
    const frag = id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
    return { endpoint: `${u.host}/…/${tail}`, deploymentId: frag };
  } catch {
    return { endpoint: 'unparseable', deploymentId: '' };
  }
}

export async function onRequestGet({ request, env }) {
  const type = new URL(request.url).searchParams.get('type') === 'subscribers'
    ? 'subscribers' : 'rsvps';
  const url = type === 'rsvps' ? env.APPS_SCRIPT_URL : env.APPS_SCRIPT_NEWSLETTER_URL;
  if (!url) return json({ ok: false, error: 'no_sheet_configured', type }, 400);

  const fp = fingerprint(url);

  let res, text;
  try {
    res = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
    text = await res.text();
  } catch (e) {
    return json({ ok: false, type, ...fp, error: 'fetch_error', detail: String(e) });
  }

  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* not JSON — almost certainly a Google page */ }

  const reachable = !!(parsed && parsed.ok === true && parsed.service);
  return json({
    ok: reachable,
    type,
    ...fp,
    status: res.status,
    service: parsed && parsed.service ? parsed.service : null,
    // Named so the admin can print a plain-English cause without re-deriving it.
    diagnosis: reachable
      ? 'reachable'
      : res.status === 403 || res.status === 401
        ? 'not_shared_with_anyone'
        : parsed
          ? 'unexpected_json'
          : 'html_response',
    snippet: reachable ? '' : text.slice(0, 140),
  });
}
