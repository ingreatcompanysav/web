// Runs before every /api/admin/* function.
//
// The REAL gate is Cloudflare Access, configured in the dashboard to protect
// the admin page and /api/admin/* — unauthenticated requests get bounced to the
// Access login and never reach this code in production.
//
// This middleware is defense-in-depth + convenience:
//   * no-store on every admin response;
//   * if env.ACCESS_REQUIRED is set (prod), verify the JWT Access mints for a
//     signed-in user. Left unset in local dev so `wrangler pages dev` works.
//
// We verify the token rather than trusting `Cf-Access-Authenticated-User-Email`:
// Access does not reliably inject that header for Pages Functions (that's what
// broke the admin), and on any hostname Access doesn't cover — a *.pages.dev
// preview URL, say — a client could just send the header itself.

// Public identifiers, not secrets: the team domain appears in every Access login
// URL and the AUD tag is on the app's "Additional settings → AUD tag" screen.
// Override per-environment with ACCESS_TEAM_DOMAIN / ACCESS_AUD if either changes.
const TEAM_DOMAIN = 'white-darkness-dc50.cloudflareaccess.com';
const AUD = '3a50382a1d9028d8110e3a5fb549f98f1d8d03791c2347e79e759321e01e232c';

// Access's signing keys, cached for the life of the isolate.
let keyCache = null;

async function accessKeys(teamDomain) {
  if (keyCache) return keyCache;
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('could not fetch Access signing keys');
  const { keys } = await res.json();
  const imported = {};
  for (const jwk of keys || []) {
    imported[jwk.kid] = await crypto.subtle.importKey(
      'jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
  }
  keyCache = imported;
  return imported;
}

const fromB64Url = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const decodePart = (s) => JSON.parse(new TextDecoder().decode(fromB64Url(s)));

// Returns the token's claims, or null if it isn't a valid, unexpired token for
// this application.
async function verifyAccessJwt(token, teamDomain, aud) {
  const [head, body, sig] = token.split('.');
  if (!head || !body || !sig) return null;

  const keys = await accessKeys(teamDomain);
  const key = keys[decodePart(head).kid];
  if (!key) return null;

  const signed = new TextEncoder().encode(`${head}.${body}`);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64Url(sig), signed))) return null;

  const claims = decodePart(body);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(aud)) return null;
  if (claims.exp && claims.exp * 1000 < Date.now()) return null;
  return claims;
}

export async function onRequest(context) {
  const { request, env, next } = context;

  if (env.ACCESS_REQUIRED) {
    const cookie = request.headers.get('cookie') || '';
    const token = request.headers.get('cf-access-jwt-assertion')
      || (cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/) || [])[1];

    const claims = token
      ? await verifyAccessJwt(token, env.ACCESS_TEAM_DOMAIN || TEAM_DOMAIN, env.ACCESS_AUD || AUD)
        .catch(() => null)
      : null;

    if (!claims) {
      // Say which signals arrived — this is the message the admin page shows, and
      // it's the difference between "logged out" and "misconfigured".
      const seen = [
        `jwt-header=${request.headers.get('cf-access-jwt-assertion') ? 1 : 0}`,
        `cf-authorization-cookie=${/(?:^|;\s*)CF_Authorization=/.test(cookie) ? 1 : 0}`,
        `email-header=${request.headers.get('cf-access-authenticated-user-email') ? 1 : 0}`,
      ].join(', ');
      return new Response(`No valid Cloudflare Access token on this request (${seen})`, { status: 401 });
    }
  }

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  return out;
}
