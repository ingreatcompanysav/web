# In Great Company — static site

Three files, no build step.

| File | What it is |
| --- | --- |
| `index.html` | The whole site. Fonts, logos, styles and scripts inlined. |
| `events.json` | The gatherings calendar. The site fetches this at load. |
| `admin.html` | Editor for `events.json`. **Gitignored — runs locally, never deployed.** |
| `start-admin.command` | Double-click launcher for the editor. **Gitignored — local only.** |

## About `index.html` (heads up before editing it)

`index.html` is not hand-written HTML — it's a **compiled bundle**: the real page (markup + styles) lives in a JSON `<script type="__bundler/template">` blob on line 384, and fonts/images live in a manifest blob on line 372. A script in the file reassembles the page in the browser. So you can't just edit the visible HTML.

Two things have been hand-patched into that bundle: a **mobile-responsive `<style>` block** (a `@media (max-width: 820px)` rule near the end of the last `<style>` — search for "Mobile responsiveness") and the **removal of the "Behind the site" nav item + section**. If you need to change the site's copy or images, that's a careful bundle edit — ask and it can be done (or the site can be rebuilt as plain HTML for easier upkeep).

## Deploy to Cloudflare (via GitHub)

1. Commit `index.html`, `events.json` and `.gitignore` to the root of `ingreatcompanysav/web` on `main`. (`admin.html` is gitignored on purpose — keep it locally.)
2. Cloudflare dashboard → Workers & Pages → your project → it redeploys on every push.
3. If the `workers.dev` URL shows "No URLs enabled": project → Settings → Domains & Routes → enable it.
4. Custom domain: Settings → Domains & Routes → add `ingreatcompany.co`. Register through Cloudflare Registrar (at cost, ~$10–15/yr). SSL is automatic.

Previous deployments stay as one-click rollbacks.

## Updating the calendar

1. Double-click **`start-admin.command`** (also gitignored, local-only). It serves this folder locally and opens the editor with your current `events.json` already loaded. Leave the little Terminal window open while you work; close it when done. (First run: right-click → Open to get past the macOS "unidentified developer" prompt.)
   - Or, from a terminal: `python3 -m http.server 8787` in this folder, then visit `http://localhost:8787/admin.html`.
2. Edit, add, reorder, remove gatherings. Pick dates/times from the calendar and clock controls; the ID fills in automatically from the title. The editor flags missing titles/IDs, duplicate IDs, and paid gatherings with no Stripe link before you upload.
3. Click **Save to events.json**. In Chrome/Edge (and the launcher's browser) the first save asks permission once, then writes straight back to `events.json` in this folder — no download step. (On Safari/Firefox the button falls back to **Download copy**, which lands in Downloads; move it into this folder.)
4. GitHub → `ingreatcompanysav/web` → Add file → Upload files → drop `events.json` in → Commit. (Or, if you use git locally, just commit and push the file the editor saved.)
5. Cloudflare redeploys within a minute.

The admin page has no login and no database of its own — it only reads and writes the one `events.json` file on your machine. That is deliberate: nothing to break or get hacked, and it's kept out of the repo so it never deploys.

**It stays off the internet.** `.gitignore` keeps `admin.html` out of the repo, so it can never be deployed by accident. If you later want it live for a second editor, remove that line and gate the URL with Cloudflare Access (Zero Trust → Access → Applications → path `admin.html` → allow specific emails, one-time PIN). Free up to 50 users.

## Selling tickets

1. Stripe dashboard → Payment Links → create one per paid gathering (name, price, quantity cap = number of seats).
2. Copy the link URL.
3. In `admin.html`, paste it into that gathering's **Stripe payment link** field.
4. Download, commit. "Get my ticket" now opens Stripe checkout.

Stripe takes ~2.9% + 30¢ per ticket and pays out to the group's bank account. Gatherings with a price of 0 and no link just confirm the seat on the page.

## Photos

Every image is a placeholder describing the shot needed. In `events.json`, the `note` field accepts an image URL instead of a description — put photos in the repo (e.g. `/photos/dinner.jpg`) and reference them there.
