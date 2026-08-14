# Front-end redesign — plan & working notes

Branch: `frontend-redesign`. Goal: replace the compiled Claude-Artifact `index.html`
(2.3 MB, self-rebuilding from base64 blobs) with a **hand-written, modular, data-driven
site** that looks identical but is editable — and add **admin-uploadable rotating photos**.

The backend (D1 + Pages Functions + Access + Turnstile + Apps Script) is unchanged; we only
rebuild the HTML/CSS/JS layer and add a photos capability.

## Locked decisions (from the client)
- **Photo storage:** Cloudflare R2 (object storage) + metadata rows in D1.
- **Photo slots:** hero image, gallery/feed section, story & join photos. (Not testimonial avatars.)
- **Stack:** plain HTML/CSS/vanilla JS, **no build step** (served as-is by Pages).

## What the current site actually is
- One SPA with client-side routing. Routes: `home`, `gatherings`, `event` (detail), `story`, `join`.
- **Dark teal theme** — a theme override remaps `--surface-page` to `#0A4247` (Dark Teal), not cream.
  The cream palette is the base; the teal block on top is what actually ships.
- Visuals come from a compiled design system `InGreatCompanyDesignSystem_2c43b4.*` (React). We
  recreate those as plain CSS components (list below), matching the live render.
- Data already comes from the backend: `componentDidMount` fetches `/api/events` (fallback to a
  hard-coded `DATA` array) and `/api/quotes` (random 3 per visit). RSVP modal is a standalone script.

## Extracted so far (Phase 0 — done)
- `redesign/reference-current-ui.html` — the full decoded template (markup + copy + routing +
  RSVP modal), base64 stripped. THE source of truth for rebuilding. Re-extract anytime with the
  patcher method in memory (`json.loads` of index.html line 384).
- Design tokens: the entire `:root` token system (palette ramps, type scale, spacing, radii,
  shadows, motion, layout) is in the reference file, lines ~205–425 (cream base) and the teal
  override at ~906–930. Drops straight into the new CSS verbatim.
- Real binary assets pulled out of the blobs into `assets/`:
  - `assets/img/logo-cream.png` (the nav/footer logo)
  - `assets/img/photo-hero.jpg` (1000×1249, 4:5), `photo-story.jpg` (1000²), `photo-join.jpg` (1000×750, 4:3)
  - `assets/img/avatar-victoria.jpg` (240²) — the one real testimonial photo
  - `assets/fonts/sisterhood.ttf` — the custom pink script face (NOT on Google Fonts; must self-host).
    Playfair Display, Montserrat, Kolker Brush are Google Fonts — load from CDN or self-host.

## Design-system components to rebuild as plain CSS
NavBar · ScriptAccent (pink Sisterhood word) · Button (variants: filled-rose default / outline /
ghost / inverse; sizes sm,lg; full-width) · Tag (tones neutral,cyan; outlined) · SectionHeading
(eyebrow + title + script word + description + align + size) · EventCard (vertical + horizontal) ·
Quote (tone cream/deep, name, detail, monogram-or-photo avatar) · Card · form Input/Select/Textarea/Checkbox.

## Plan
- **Phase 1 — Scaffold.** `index.html` + `assets/css/tokens.css` (verbatim tokens + teal theme) +
  `base.css` + `components.css`; `assets/js/` modules (router, api, render helpers). Fonts wired.
- **Phase 2 — Rebuild sections** against the reference, verifying side-by-side vs. https://web-cvd.pages.dev:
  home (hero, follow-along, featured events, story strip, quotes, join band), gatherings list,
  event detail (+ RSVP/Stripe panel), story, join form. Port the RSVP modal as a clean module.
- **Phase 3 — Photos backend.** R2 bucket + binding; `photos` table (slot, url/key, alt, sort, active);
  `GET /api/photos`; gated `/api/admin/photos` CRUD (upload to R2).
- **Phase 4 — Photos in UI + admin.** Hero/gallery/story/join rotate among active photos; new
  "Photos" admin tab (in-browser resize on upload, caption, slot, reorder, active toggle).
- **Phase 5 — Verify & cutover.** Full side-by-side + mobile + RSVP + Access check. Old bundle stays
  in git history. Deploy only on the client's go.

## Guardrails
- Nothing deploys until approved. Old `index.html` is preserved in git history on `main`.
- Match the live render, not memory — screenshot-compare each section.
