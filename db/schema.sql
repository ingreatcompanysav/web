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
--   * slot groups a photo to a surface: hero | gallery | story | join.
--   * hero/story/join rotate (a random active one per visit); gallery is a grid.
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
