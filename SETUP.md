# Backend setup — one-time runbook

The site now has a small backend on Cloudflare: a **D1** database, a few **Pages
Functions** (the `/api/*` endpoints), **Cloudflare Access** to lock the admin,
and a **Google Apps Script** that copies RSVPs into a Sheet. This file is the
checklist to wire it all up. You only do this once.

You need [Node.js](https://nodejs.org) installed (for the `wrangler` CLI) and to
be logged into the Cloudflare account that owns the Pages project.

---

## 1. Create the database

From the `web/` folder:

```bash
npx wrangler login
npx wrangler d1 create igc
```

Copy the `database_id` it prints into **`wrangler.toml`** (replace
`REPLACE_AFTER_wrangler_d1_create`).

Create the tables and load the current data (events + quotes), locally and in
production:

```bash
npx wrangler d1 execute igc --local  --file=./db/schema.sql
npx wrangler d1 execute igc --local  --file=./db/seed.sql
npx wrangler d1 execute igc --remote --file=./db/schema.sql
npx wrangler d1 execute igc --remote --file=./db/seed.sql
```

## 2. Bind the database to Pages

> Note: your `/api/*` endpoints are **Pages Functions** — the files in
> `functions/`. They deploy automatically on every push to GitHub. There is **no
> "add a function" button** in the dashboard, and you do **not** create a
> standalone Worker. The only dashboard step is attaching the database below.

Cloudflare dashboard → **Workers & Pages** → your **Pages project** (the one
already serving the site) → **Settings → Bindings → Add → D1 database
bindings**. Set:

- Variable name: `DB`   (must match exactly — it's `context.env.DB` in the code)
- D1 database: `igc`

Save, then **redeploy** (push a commit or use "Retry deployment") for it to take
effect. If the dashboard offers separate Production and Preview environments, add
the binding to both.

## 3. Environment variables

Same project → **Settings → Variables and Secrets** (older UI: "Environment
variables"), Production + Preview. Add these as **Secret** (encrypted) values
(you'll fill in the actual values in later steps):

| Name | What it is |
| --- | --- |
| `APPS_SCRIPT_URL` | The Google Apps Script web-app `/exec` URL (step 6) |
| `APPS_SCRIPT_TOKEN` | A long random string; must match the Apps Script's `RSVP_TOKEN` |
| `TURNSTILE_SECRET` | Turnstile secret key (step 5) |
| `ACCESS_REQUIRED` | Set to `1` — makes the admin API reject any request without a Cloudflare Access identity |

## 4. Lock the admin with Cloudflare Access

Cloudflare **Zero Trust → Access → Applications → Add an application →
Self-hosted**. Create **two** applications (or one app with two paths):

- Path `admin.html`
- Path `/api/admin/*`

For each, add a policy: **Allow**, include the **email addresses** of the two
editors, and pick a login method (**One-time PIN** to their email, and/or Google
sign-in). Leave the rest of the site — `/api/events`, `/api/quotes`,
`/api/rsvp`, and every public page — **ungated**.

> Quick check after this: in a private window, visiting `/admin.html` should
> prompt for login, but `/api/events` should return JSON without any prompt.

## 5. Turnstile (RSVP spam protection)

Cloudflare dashboard → **Turnstile → Add site**. Enter the site's hostname.
It gives you two keys:

- **Site key** (public) → open **`index.html`**, search for
  `REPLACE_WITH_TURNSTILE_SITE_KEY`, and paste the site key there.
- **Secret key** → the `TURNSTILE_SECRET` env var from step 3.

Set both at the same time. (If the site key is left as the placeholder, the
widget is skipped and the server skips the check — handy for local testing.)

## 6. Google Apps Script (RSVP → Sheet)

Follow the header comments in **`apps-script/rsvp.gs`**:

1. Open the Google Sheet that should collect RSVPs → Extensions → Apps Script.
2. Paste in `apps-script/rsvp.gs`; add a header row to the sheet.
3. Script properties → add `RSVP_TOKEN` = the same value as `APPS_SCRIPT_TOKEN`.
4. Deploy → New deployment → **Web app**, execute as **you**, access **Anyone**.
5. Copy the `/exec` URL into the `APPS_SCRIPT_URL` env var (step 3).

## 7. Deploy

Commit and push the branch, open a pull request, and let Cloudflare build the
**preview** deployment first. Verify on the preview URL:

- `/admin.html` → prompts for Access login; you can add/edit gatherings and
  quotes and see them save.
- The public site shows gatherings and quotes from the database.
- A test RSVP on a free gathering lands in the **RSVPs** admin tab **and** in the
  Google Sheet.

Then merge to `main` to go live. The previous deployment stays as a one-click
rollback.

---

## Local development

```bash
npx wrangler pages dev .
```

This serves the site with the Functions and a **local** copy of D1 (seeded in
step 1 with `--local`) and reads secrets from `.dev.vars`. Cloudflare Access
doesn't run locally, so the admin is open on `localhost` — that's expected.
Leave `ACCESS_REQUIRED` **out** of `.dev.vars` so the admin API works locally.

## After the database is proven

`events.json` is no longer read by the site (the bundle now fetches
`/api/events`). Once you're happy the database is working, `events.json` can be
deleted. The three original quotes still live in `index.html` as a **fallback**
(shown only if `/api/quotes` fails) and have also been seeded into the database;
once the database is proven, that fallback array can be removed from the bundle
too — see the `voices:` line in the template blob.
