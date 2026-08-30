-- Newsletter signups, with a per-subscriber token for one-click unsubscribe.
--
-- Apply:  npx wrangler d1 execute igc --local  --file=./db/migration-subscribers.sql
--         npx wrangler d1 execute igc --remote --file=./db/migration-subscribers.sql
--
-- Safe to re-run: CREATE TABLE / CREATE INDEX are both IF NOT EXISTS.
--
-- Notes:
--   * email is stored lowercased and trimmed, and is UNIQUE — re-subscribing an
--     address updates the existing row instead of creating a duplicate.
--   * status is 'subscribed' | 'unsubscribed'. Unsubscribing keeps the row as a
--     suppression record so a later re-import can't silently re-add someone.
--   * token is unguessable (128 bits, hex) and is what makes the unsubscribe
--     link in a newsletter work without a login.

CREATE TABLE IF NOT EXISTS subscribers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name      TEXT NOT NULL,
  last_name       TEXT    DEFAULT '',
  email           TEXT NOT NULL,
  token           TEXT NOT NULL,
  status          TEXT    DEFAULT 'subscribed',
  source          TEXT    DEFAULT '',   -- which form they used: home | links
  synced_sheet    INTEGER DEFAULT 0,    -- 1 once mirrored to the Google Sheet
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now')),
  unsubscribed_at TEXT    DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(token);
