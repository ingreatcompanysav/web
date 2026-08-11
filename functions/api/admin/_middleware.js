// Runs before every /api/admin/* function.
//
// The REAL gate is Cloudflare Access, configured in the dashboard to protect
// the /api/admin/* path — unauthenticated requests never reach this code in
// production. Access also injects `Cf-Access-Authenticated-User-Email` and
// strips any client-supplied `Cf-*` headers at the edge, so that header is
// trustworthy.
//
// This middleware is defense-in-depth + convenience:
//   * no-store on every admin response;
//   * if env.ACCESS_REQUIRED is set (prod), reject requests with no Access
//     identity header. Left unset in local dev so `wrangler pages dev` works.
export async function onRequest(context) {
  const { request, env, next } = context;
  const email = request.headers.get('cf-access-authenticated-user-email');

  if (env.ACCESS_REQUIRED && !email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  return out;
}
