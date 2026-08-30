# Backend setup — one-time runbook

The site now has a small backend on Cloudflare: a **D1** database, a few **Pages
Functions** (the `/api/*` endpoints), **Cloudflare Access** to lock the admin,
and a **Google Apps Script** that copies RSVPs into a Sheet. This file is the
checklist to wire it all up. You only do this once.

You need [Node.js](https://nodejs.org) installed (for the `wrangler` CLI) and to
be logged into the Cloudflare account that owns the Pages project.

> **Order matters.** The dashboard won't let you add secrets until a deployment
> actually includes the `functions/` folder ("Variables cannot be added to a
> Worker that only has static assets"). So the sequence is: create the DB →
> lock the admin with Access → **deploy** → *then* add secrets. None of the
> secrets are needed for the site to work in the meantime.

---

## 1. Create the database

From the `web/` folder:

```bash
npx wrangler login
npx wrangler d1 create igc
```

Copy the `database_id` it prints into **`wrangler.toml`** (replace
`REPLACE_AFTER_wrangler_d1_create`), and commit that change.

Create the tables and load the current data (events + quotes), locally and in
production:

```bash
npx wrangler d1 execute igc --local  --file=./db/schema.sql
npx wrangler d1 execute igc --local  --file=./db/seed.sql
npx wrangler d1 execute igc --remote --file=./db/schema.sql
npx wrangler d1 execute igc --remote --file=./db/seed.sql
```

> The `DB` binding does **not** need a dashboard step — `wrangler.toml` declares
> it (`binding = "DB"`), and because a Wrangler config is present Cloudflare
> treats it as the source of truth and applies it on deploy. After deploying you
> can *see* it (read-only) under Settings → Bindings.

## 2. Lock the admin with Cloudflare Access — BEFORE deploying

Do this before the Functions go live, so `admin.html` is never publicly
reachable. Access gates the URL at Cloudflare's edge regardless of whether the
code is deployed yet.

Cloudflare **Zero Trust → Access → Applications → Add an application →
Self-hosted**. Create **two** applications (or one app with two paths):

- Path `admin.html`
- Path `/api/admin/*`

For each, add a policy: **Allow**, include the **email addresses** of the two
editors, and pick a login method (**One-time PIN** to their email, and/or Google
sign-in). Leave the rest of the site — `/api/events`, `/api/quotes`,
`/api/rsvp`, and every public page — **ungated**.

## 3. Deploy the Functions

Your Pages project builds from GitHub. Push so the deployment includes
`functions/`:

```bash
git push            # if the project only builds `main`, merge backend -> main first
```

Do **not** run `wrangler deploy` (that's for standalone Workers and will error
with "Missing entry-point"). If you ever deploy from the CLI, it's
`npx wrangler pages deploy .`.

After this build finishes, the project is a Worker-with-Functions. Quick check:

- Public: visiting `/api/events` returns a JSON array with your seeded event.
- Admin: visiting `/admin.html` in a private window prompts for Access login.

## 4. Add the secrets (now unlocked)

Cloudflare dashboard → your Pages project → **Settings → Variables and Secrets**
(older UI: "Environment variables"). This screen is available only *after* step 3.
Add these as **Secret** (encrypted) values, for Production (and Preview if shown):

| Name | What it is |
| --- | --- |
| `APPS_SCRIPT_URL` | The Google Apps Script web-app `/exec` URL (step 6) |
| `APPS_SCRIPT_TOKEN` | A long random string; must match the Apps Script's `RSVP_TOKEN` |
| `TURNSTILE_SECRET` | Turnstile secret key (step 5) |
| `ACCESS_REQUIRED` | Set to `1` — defense-in-depth: the admin API also verifies the Cloudflare Access JWT (`Cf-Access-Jwt-Assertion` header or `CF_Authorization` cookie) and rejects anything without a valid one |

Redeploy (or push a commit) so the new values take effect. Until you set these,
RSVPs still save to the database — they just don't copy to the Sheet, and the
Turnstile check is skipped.

## 5. Turnstile (RSVP spam protection)

Cloudflare dashboard → **Turnstile → Add site**. Enter the site's hostname.
It gives you two keys:

- **Site key** (public) → open **`index.html`**, search for
  `REPLACE_WITH_TURNSTILE_SITE_KEY`, paste the site key there, and commit/deploy.
- **Secret key** → the `TURNSTILE_SECRET` secret from step 4.

Set both at the same time. (If the site key is left as the placeholder, the
widget is skipped and the server skips the check — handy for local testing.)

## 6. Google Apps Script (RSVP → Sheet)

Follow the header comments in **`apps-script/rsvp.gs`**:

1. Open the Google Sheet that should collect RSVPs → Extensions → Apps Script.
2. Paste in `apps-script/rsvp.gs`; add a header row to the sheet.
3. Script properties → add `RSVP_TOKEN` = the same value as `APPS_SCRIPT_TOKEN`.
4. The RSVP form collects **first and last name** (matching the newsletter), so
   the sheet wants `First name` and `Last name` columns. The script matches on
   header *text*, not position, so on an existing sheet just insert the two
   columns anywhere — Sheets shifts the old rows for you. A legacy `Name` column
   keeps being filled with the combined "first last", so you can keep or delete
   it. Run `db/migration-rsvp-names.sql` to add the columns in D1 and split the
   names already stored.
4. Deploy → New deployment → **Web app**, execute as **you**, access **Anyone**.
5. Copy the `/exec` URL into the `APPS_SCRIPT_URL` secret from step 4.

## 6b. Photos storage (R2) — for the rotating photos

The admin can upload photos that rotate on the site (hero, story, join) and fill
a gallery grid. The image files live in a Cloudflare **R2** bucket; their
metadata lives in the `photos` table in D1.

1. **Bucket.** The bucket **`igcsav`** already exists in this account. To confirm
   or recreate: dashboard → **R2 → Create bucket** → name it `igcsav`. Keep it
   **private** (no public access needed; the site serves images through a
   Function).
2. **Binding.** `wrangler.toml` already declares `binding = "PHOTOS"` →
   `igcsav`, so local dev and deploys pick it up. For production, also add it in
   the dashboard: Pages project → **Settings → Functions → R2 bindings** →
   variable name `PHOTOS`, bucket `igcsav`.
3. **Tables.** Re-run the schema so the new `photos` table is created (safe to
   re-run; it uses `IF NOT EXISTS`):

   ```bash
   npx wrangler d1 execute igc --local  --file=./db/schema.sql
   npx wrangler d1 execute igc --remote --file=./db/schema.sql
   ```

That is all the setup. The endpoints come with the next deploy:

- Public `GET /api/photos` returns active photos grouped by slot.
- Images stream from `GET /img/<key>` (public, cached one year).
- Admin `GET/POST /api/admin/photos` and `PUT/DELETE /api/admin/photos/:id` are
  gated by the same Access rule as the rest of `/api/admin/*`. The admin page
  resizes each image in the browser before upload, so stored files stay small.

Until a photo is uploaded to a slot, the site shows its built-in image, so
nothing breaks in the meantime.

## 6c. Links page — the Linktree-style /links

A public page at **`/links`** showing a one-tap list of buttons (Instagram, the
Facebook group, gatherings, email), edited from the admin page's **Links** tab.
It is the link to put in an Instagram bio.

1. **Table.** Run the migration once per database. It creates the `links` table
   and, only if the table is empty, seeds the four links already in the site
   footer so the page isn't blank on day one:

   ```bash
   npx wrangler d1 execute igc --local  --file=./db/migration-links.sql
   npx wrangler d1 execute igc --remote --file=./db/migration-links.sql
   ```

   (The same table is in `db/schema.sql` for fresh databases; the migration is
   safe to re-run.)
2. **Nothing else.** No bindings, no secrets — it uses the existing `DB`.

The endpoints come with the deploy:

- Public `GET /api/links` returns the active links in order.
- Admin `GET/POST /api/admin/links` and `PUT/DELETE /api/admin/links/:id`, plus
  `POST /api/admin/reorder` with `{"type":"links"}`, behind the same Access rule
  as the rest of `/api/admin/*`.

If the API is ever unreachable, the page falls back to the four links hard-coded
in `assets/js/links.js`, so it never renders empty.

## 6d. Newsletter — signups, the second Sheet, and opt-out

A signup form on the home page and the /links page writes to D1 and mirrors to a
**second** Google Sheet (separate from the RSVP one). People opt out through a
personal link in your emails, or from `/unsubscribe`.

1. **Table.** Run the migration once per database:

   ```bash
   npx wrangler d1 execute igc --local  --file=./db/migration-subscribers.sql
   npx wrangler d1 execute igc --remote --file=./db/migration-subscribers.sql
   ```

2. **Sheet + Apps Script.** Create a NEW spreadsheet for the newsletter, then
   follow the setup block at the top of `apps-script/newsletter.gs`. Its header
   row must be, in this order:

   ```
   Timestamp | First name | Last name | Email | Status | Source | Unsubscribe link
   ```

   Use the **same** `RSVP_TOKEN` script property as the RSVP script, so both
   match the single `APPS_SCRIPT_TOKEN` env var.

3. **Env var.** Put the new web app's `/exec` URL in
   `APPS_SCRIPT_NEWSLETTER_URL` (Pages → Settings → Environment variables, and
   `.dev.vars` locally). Leave it unset and signups still save to D1 — only the
   Sheet mirror is skipped.

**Sending the newsletter.** The **Unsubscribe link** column holds each person's
own URL (`/unsubscribe?t=<token>`). Mail-merge that column into your email so
every recipient gets their own one-click opt-out. Do not reuse one person's link
for everyone — it identifies the subscriber.

**How opt-out behaves.** Clicking the link opens a confirmation page; the opt-out
only happens on the click, never on page load, because mail scanners follow links
in email and would otherwise unsubscribe people automatically. Someone without
the link can use `/unsubscribe` and type their address (Turnstile-guarded).
Either way the row is **marked**, never deleted — that record is what stops a
later re-import from silently adding them back.

**Admin.** The **Newsletter** tab lists everyone, filters by subscribed vs
unsubscribed, and downloads CSV. Each row has **Unsubscribe** / **Re-subscribe**
for when a link fails someone or an address shouldn't be on the list, plus a
**Delete** for junk signups. Both update the Google Sheet too. Prefer
Unsubscribe for real people: Delete removes the suppression record, so that
address could sign up again.

## 7. Final verification

- `/admin.html` → Access login → you can add/edit gatherings and quotes and see
  them save; the RSVPs tab loads.
- `/links` lists the links, and editing one in the admin's **Links** tab changes
  the page after a save.
- A test signup on the home page lands in the **Newsletter** admin tab **and** in
  the newsletter Sheet; the unsubscribe link in that Sheet row opts you back out.
- The public site shows gatherings and quotes from the database.
- A test RSVP on a free gathering lands in the **RSVPs** admin tab **and** in the
  Google Sheet.

Previous deployments stay as one-click rollbacks.

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
