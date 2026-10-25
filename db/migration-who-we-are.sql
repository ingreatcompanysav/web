-- "Who we are" page: the group's own description plus a profile card per
-- organiser, both edited from the admin's Who we are tab. Run once against
-- each database (safe to re-run):
--   npx wrangler d1 execute igc --local  --file=./db/migration-who-we-are.sql
--   npx wrangler d1 execute igc --remote --file=./db/migration-who-we-are.sql

-- One-off site text, keyed by name. Only 'about_intro' so far: the paragraphs
-- at the top of the Who we are page, separated by blank lines.
CREATE TABLE IF NOT EXISTS site_text (
  key         TEXT PRIMARY KEY,
  value       TEXT    DEFAULT '',
  updated_at  TEXT    DEFAULT (datetime('now'))
);

-- The organisers' profile cards, in sort_order. photo is an /img/ URL from
-- the admin's upload (or any URL); empty falls back to a monogram.
-- links is a JSON array of {kind, url, label}: kind is a social network key
-- (instagram, tiktok, ...) or 'website' for a custom link with its own label.
CREATE TABLE IF NOT EXISTS team (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  role        TEXT    DEFAULT '',
  bio         TEXT    DEFAULT '',
  photo       TEXT    DEFAULT '',
  links       TEXT    DEFAULT '[]',
  active      INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    DEFAULT (datetime('now'))
);
