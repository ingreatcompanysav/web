-- Ties a gathering to the Google Calendar event it was published from
-- (see functions/_shared/calendar.js). Run once against each database:
--   npx wrangler d1 execute igc --local  --file=./db/migration-events-calendar.sql
--   npx wrangler d1 execute igc --remote --file=./db/migration-events-calendar.sql
-- SQLite has no "ADD COLUMN IF NOT EXISTS"; re-running errors harmlessly with
-- "duplicate column name".
ALTER TABLE events ADD COLUMN calendar_uid TEXT DEFAULT '';
