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
  active      INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rsvps (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      TEXT    DEFAULT '',
  name          TEXT NOT NULL,
  email         TEXT    DEFAULT '',
  guests        INTEGER DEFAULT 1,
  note          TEXT    DEFAULT '',
  synced_sheet  INTEGER DEFAULT 0,   -- 1 once mirrored to the Google Sheet
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);
