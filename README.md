# In Great Company — static site

`index.html` is the whole site: one self-contained file with fonts, logos, styles and scripts inlined. No build step.

## Deploy to Cloudflare Pages (via GitHub)

1. Commit `index.html` to the root of `ingreatcompanysav/web` on `main`.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo.
3. Build settings: **Framework preset: None**, **Build command: (leave empty)**, **Output directory: /**.
4. Save and Deploy. Live in ~30s at `web-xxx.pages.dev`.
5. Custom domain: Pages → project → Custom domains → add `ingreatcompany.co`. Register through Cloudflare Registrar (at-cost, ~$10-15/yr). SSL is automatic.

Every push to `main` redeploys. Previous deployments stay as one-click rollbacks.

## Selling tickets

Cloudflare only serves the page — it cannot take money.

1. Stripe dashboard → Payment Links → create one per paid gathering (name, price, quantity limit).
2. Copy the link URL.
3. In `index.html`, find the event's "Get my ticket" button and point it at that URL.

Stripe takes ~2.9% + 30¢ per ticket and pays out to the group's bank account. Free gatherings can point at a Tally or Google Form instead.

## Editing content

Event details, quotes and copy live near the top of the inlined script in a `DATA` array — each gathering has `title`, `date`, `time`, `place`, `price`, `blurb` and `detail`. Change the text, commit, done.

Photos are placeholders describing the shot needed. Replace each with an `<img>` once real photography exists.
