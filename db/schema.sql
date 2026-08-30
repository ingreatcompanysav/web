-- In Great Company — D1 schema.
-- Apply:  npx wrangler d1 execute igc --local  --file=./db/schema.sql
--         npx wrangler d1 execute igc --remote --file=./db/schema.sql
--
-- Notes:
--   * date/time are DISPLAY strings ("Sun, Aug 16" / "9:30am"), printed as-is
--     by the site — no date math, matching the original events.json behavior.
--   * sort_order replaces the old JSON array position for manual ordering.
--   * price stays whole-dollar INTEGER (matches current data).
--   * No CHECK on tone: events use cyan/rose/gold, quotes use cream/deep — the
--     admin UI validates; the DB just stores the string.

CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  date          TEXT    DEFAULT '',
  time          TEXT    DEFAULT '',
  place         TEXT    DEFAULT '',
  category      TEXT    DEFAULT '',
  tone          TEXT    DEFAULT 'cyan',
  price         INTEGER DEFAULT 0,
  stripe_url    TEXT    DEFAULT '',
  facebook_url  TEXT    DEFAULT '',
  blurb         TEXT    DEFAULT '',
  detail        TEXT    DEFAULT '',
  note          TEXT    DEFAULT '',
  image         TEXT    DEFAULT '',
  -- Real calendar date (ISO 'YYYY-MM-DD') used to auto-place a gathering as
  -- upcoming vs past. Empty = undated (TBD), always treated as upcoming.
  -- `date`/`time` above stay the human display strings shown on the site.
  event_date    TEXT    DEFAULT '',
  -- Manual hide for drafts/cancelled events — shown nowhere when 1.
  hidden        INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  updated_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  detail      TEXT    DEFAULT '',
  tone        TEXT    DEFAULT 'cream',
  body        TEXT NOT NULL,
  monogram    TEXT    DEFAULT '',   -- optional; falls back to first letter of name
  avatar      TEXT    DEFAULT '',   -- optional photo; falls back to the monogram
  active      INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rsvps (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      TEXT    DEFAULT '',
  -- first_name/last_name are what the form collects (matching the newsletter);
  -- `name` is kept as the combined "first last" the Sheet and CSV already use.
  first_name    TEXT    DEFAULT '',
  last_name     TEXT    DEFAULT '',
  name          TEXT NOT NULL,
  email         TEXT    DEFAULT '',
  guests        INTEGER DEFAULT 1,
  note          TEXT    DEFAULT '',
  synced_sheet  INTEGER DEFAULT 0,   -- 1 once mirrored to the Google Sheet
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);

-- Rotating photos, uploaded from the admin page. The binary lives in the R2
-- bucket (binding PHOTOS); this table holds the metadata. Served at /img/<r2_key>.
--   * slot groups a photo to a surface: hero | gallery | join.
--   * hero/join rotate (a random active one per visit); gallery is a grid.
CREATE TABLE IF NOT EXISTS photos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slot          TEXT    DEFAULT 'gallery',
  r2_key        TEXT    NOT NULL,
  alt           TEXT    DEFAULT '',
  content_type  TEXT    DEFAULT 'image/jpeg',
  width         INTEGER DEFAULT 0,
  height        INTEGER DEFAULT 0,
  bytes         INTEGER DEFAULT 0,
  active        INTEGER DEFAULT 1,
  sort_order    INTEGER DEFAULT 0,
  created_at    TEXT    DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_photos_slot ON photos(slot, sort_order);

-- The Linktree-style /links page. Ordered list of outbound links the client
-- edits from the admin page's Links tab; the page shows the active ones.
--   * icon is a key into the small inline SVG set in assets/js/links.js
--     (instagram | facebook | email | calendar | ticket | heart | link).
--   * tone picks the accent colour: rose | cyan | gold | cream.
CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  subtitle    TEXT    DEFAULT '',
  icon        TEXT    DEFAULT '',
  tone        TEXT    DEFAULT 'rose',
  active      INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    DEFAULT (datetime('now'))
);

-- Newsletter signups.
--   * email is stored lowercased and trimmed, and is UNIQUE — re-subscribing an
--     address updates the existing row instead of creating a duplicate.
--   * token is the unsubscribe credential: 128 random bits that make a
--     one-click opt-out link work with no login and resist brute force. It is
--     never returned by a public endpoint.
--   * status is 'subscribed' | 'unsubscribed'. Unsubscribing flips the status
--     rather than deleting the row, so the suppression record survives a later
--     re-import and can't silently re-add someone.
CREATE TABLE IF NOT EXISTS subscribers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name      TEXT NOT NULL,
  last_name       TEXT    DEFAULT '',
  email           TEXT NOT NULL,
  token           TEXT NOT NULL,
  status          TEXT    DEFAULT 'subscribed',
  source          TEXT    DEFAULT '',
  synced_sheet    INTEGER DEFAULT 0,
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now')),
  unsubscribed_at TEXT    DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(token);
