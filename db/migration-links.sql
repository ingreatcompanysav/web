-- Adds the `links` table behind the public /links page (a Linktree-style list
-- the client edits from the admin page's Links tab).
--
-- Apply:  npx wrangler d1 execute igc --local  --file=./db/migration-links.sql
--         npx wrangler d1 execute igc --remote --file=./db/migration-links.sql
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  subtitle    TEXT    DEFAULT '',
  icon        TEXT    DEFAULT '',   -- key into the icon set in assets/js/links.js
  tone        TEXT    DEFAULT 'rose',
  active      INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    DEFAULT (datetime('now'))
);

-- Seed the three links already hard-coded in the site footer, so the page has
-- something to show the moment it goes live. Only runs on an empty table.
INSERT INTO links (label, url, subtitle, icon, tone, active, sort_order)
SELECT * FROM (
  SELECT 'Follow us on Instagram' AS label, 'https://www.instagram.com/ingreatcompanysav' AS url,
         '@ingreatcompanysav' AS subtitle, 'instagram' AS icon, 'rose' AS tone, 1 AS active, 0 AS sort_order
  UNION ALL SELECT 'Join the Facebook group', 'https://www.facebook.com/groups/ingreatcompanysav',
         'Where the day-to-day chatter happens', 'facebook', 'cyan', 1, 1
  UNION ALL SELECT 'See upcoming gatherings', 'https://ingreatcompanysav.com/#gatherings',
         'Coffee, dinners, walks — all of it', 'calendar', 'gold', 1, 2
  UNION ALL SELECT 'Email us', 'mailto:contact@ingreatcompanysav.com',
         'contact@ingreatcompanysav.com', 'email', 'cream', 1, 3
) WHERE NOT EXISTS (SELECT 1 FROM links);
