# In Great Company — static site

Three files, no build step.

| File | What it is |
| --- | --- |
| `index.html` | The whole site. Fonts, logos, styles and scripts inlined. |
| `events.json` | The gatherings calendar. The site fetches this at load. |
| `admin.html` | Editor for `events.json`. **Gitignored — runs locally, never deployed.** |

## Deploy to Cloudflare (via GitHub)

1. Commit `index.html`, `events.json` and `.gitignore` to the root of `ingreatcompanysav/web` on `main`. (`admin.html` is gitignored on purpose — keep it locally.)
2. Cloudflare dashboard → Workers & Pages → your project → it redeploys on every push.
3. If the `workers.dev` URL shows "No URLs enabled": project → Settings → Domains & Routes → enable it.
4. Custom domain: Settings → Domains & Routes → add `ingreatcompany.co`. Register through Cloudflare Registrar (at cost, ~$10–15/yr). SSL is automatic.

Previous deployments stay as one-click rollbacks.

## Updating the calendar

1. Open your local `admin.html` (double-click it — keep a copy of `events.json` in the same folder so it loads the current calendar).
2. Edit, add, reorder, remove gatherings.
3. **Download events.json**.
4. GitHub → `ingreatcompanysav/web` → Add file → Upload files → drop `events.json` in → Commit.
5. Cloudflare redeploys within a minute.

The admin page saves nothing on its own — it only produces the file. That is deliberate: no login, no database, nothing to break or get hacked.

**It stays off the internet.** `.gitignore` keeps `admin.html` out of the repo, so it can never be deployed by accident. If you later want it live for a second editor, remove that line and gate the URL with Cloudflare Access (Zero Trust → Access → Applications → path `admin.html` → allow specific emails, one-time PIN). Free up to 50 users.

## Selling tickets

1. Stripe dashboard → Payment Links → create one per paid gathering (name, price, quantity cap = number of seats).
2. Copy the link URL.
3. In `admin.html`, paste it into that gathering's **Stripe payment link** field.
4. Download, commit. "Get my ticket" now opens Stripe checkout.

Stripe takes ~2.9% + 30¢ per ticket and pays out to the group's bank account. Gatherings with a price of 0 and no link just confirm the seat on the page.

## Photos

Every image is a placeholder describing the shot needed. In `events.json`, the `note` field accepts an image URL instead of a description — put photos in the repo (e.g. `/photos/dinner.jpg`) and reference them there.
