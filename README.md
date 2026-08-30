# In Great Company — site

A static site on **Cloudflare Pages** with a small serverless backend
(**Cloudflare D1** + **Pages Functions**) for the parts that need to change
often: gatherings, member quotes, and event RSVPs. Two editors manage
everything from a browser admin, gated by **Cloudflare Access**.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The public site's entry point — a static hero for crawlers, then `assets/js/app.js` takes over. Fetches `/api/events`, `/api/quotes` and `/api/photos`, and shows an RSVP form on each gathering. |
| `admin.html` | The editor for gatherings, quotes and RSVPs. **Deployed, but locked behind Cloudflare Access** — only the two editors' emails can open it. |
| `functions/` | The `/api/*` endpoints (Pages Functions) that read and write the database. |
| `db/` | `schema.sql` (tables) and `seed.sql` (initial data). |
| `package.json` | Pins the `wrangler` CLI. Dev-only — nothing here is served to the browser. |
| `apps-script/` | The Google Apps Scripts that mirror RSVPs and newsletter signups into Google Sheets. |
| `wrangler.toml` | Declares the D1 binding (needed for local dev and the build). |

## First-time setup

See **[SETUP.md](SETUP.md)** — the one-time runbook for creating the database,
binding it, locking the admin with Access, wiring Turnstile, and connecting the
Google Sheet. You only do that once.

## How the site is put together

No build step and no framework: Cloudflare Pages serves the files in this repo
exactly as they are.

| Layer | Where |
| --- | --- |
| Markup | `index.html` (static hero for crawlers), `links.html`, `unsubscribe.html`, `404.html` |
| Styles | `assets/css/` — `tokens.css` (design tokens), `base.css`, `components.css` |
| App | `assets/js/app.js` renders the hash-routed views; `api.js` talks to the backend |

## Day-to-day: editing the site

1. Go to `https://<the-site>/admin.html` and sign in (Cloudflare Access emails a
   one-time code, or you sign in with Google).
2. **Gatherings** tab — add, edit, reorder, or remove events. Pick dates/times
   from the calendar/clock; the ID fills in from the title. It flags missing
   titles/IDs, duplicate IDs, and paid events with no Stripe link.
3. **Quotes** tab — add member quotes. The home page shows a few **at random**
   on each visit, so add as many as you like. Toggle one **off** to hide it
   without deleting it.
4. **RSVPs** tab — see everyone who has signed up (also written to your Google
   Sheet), filter by gathering, and download a CSV.
5. Click **Save changes**. The public site updates immediately — no GitHub
   upload, no redeploy.

## Selling tickets

1. Stripe dashboard → Payment Links → create one per paid gathering (name,
   price, quantity cap = number of seats).
2. Copy the link URL.
3. In the admin, paste it into that gathering's **Stripe payment link** field and
   set a price. "Get My Ticket" now opens Stripe checkout.

Free gatherings (price 0, no link) show the **RSVP form** instead — the attendee
enters their name and it's recorded in the database and the Google Sheet.

Stripe takes ~2.9% + 30¢ per ticket and pays out to the group's bank account.

## Deploying code changes

Cloudflare Pages redeploys on every push to `main` (`ingreatcompanysav/web`).
Work on a branch, open a PR, check the **preview** deployment, then merge.
Previous deployments stay as one-click rollbacks.

## Photos

Upload them in the admin — **Photos** tab for the rotating hero/gallery/join
images, or the image field on a gathering. They go to the R2 bucket and are
served from `/img/<key>`; nothing needs to be committed to the repo.
