# In Great Company — site

A static site on **Cloudflare Pages** with a small serverless backend
(**Cloudflare D1** + **Pages Functions**) for the parts that need to change
often: gatherings, member quotes, and event RSVPs. Two editors manage
everything from a browser admin, gated by **Cloudflare Access**.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The whole public site. Fonts, logos, styles and scripts inlined. It fetches `/api/events` and `/api/quotes` at load, and shows an RSVP form on each gathering. |
| `admin.html` | The editor for gatherings, quotes and RSVPs. **Deployed, but locked behind Cloudflare Access** — only the two editors' emails can open it. |
| `functions/` | The `/api/*` endpoints (Pages Functions) that read and write the database. |
| `db/` | `schema.sql` (tables) and `seed.sql` (initial data). |
| `apps-script/rsvp.gs` | The Google Apps Script that copies each RSVP into a Google Sheet. |
| `wrangler.toml` | Declares the D1 binding (needed for local dev and the build). |
| `events.json` | The original calendar file. **No longer read by the site** — kept until the database is proven, then delete. |

## First-time setup

See **[SETUP.md](SETUP.md)** — the one-time runbook for creating the database,
binding it, locking the admin with Access, wiring Turnstile, and connecting the
Google Sheet. You only do that once.

## About `index.html` (heads up before editing it)

`index.html` is not hand-written HTML — it's a **compiled bundle**: the real page
(markup + styles + app logic) lives in a JSON `<script type="__bundler/template">`
blob on line 384, and fonts/images live in a manifest blob on line 372. A loader
reassembles the page in the browser. So you can't just edit the visible HTML.

Hand-patched into that bundle: a mobile-responsive `<style>` block; the app now
fetches `/api/events` and `/api/quotes` (with the original data kept as a
fallback); and a self-contained **RSVP modal** (search the blob for
`igcOpenRSVP`). The one thing you'll likely touch by hand is the **Turnstile
site key** — search `index.html` for `REPLACE_WITH_TURNSTILE_SITE_KEY`.

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

In a gathering's `note` field you can paste an image URL instead of a
description; put photos in the repo (e.g. `/photos/dinner.jpg`) and reference
them there.
