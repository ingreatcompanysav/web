-- Migration: automatic past/upcoming placement for gatherings.
--   * event_date — the real calendar date (ISO 'YYYY-MM-DD'). Events fall off
--     the main page on their own once this date has passed. Empty = undated,
--     always treated as upcoming.
--   * hidden — manual hide for drafts/cancelled events (shown nowhere when 1).
-- Existing rows get empty event_date (undated) and hidden = 0 until edited.
--
-- Apply:  npx wrangler d1 execute igc --local  --file=./db/migration-events-dates.sql
--         npx wrangler d1 execute igc --remote --file=./db/migration-events-dates.sql
--
-- SQLite has no "ADD COLUMN IF NOT EXISTS"; run this once. Re-running errors
-- harmlessly with "duplicate column name".
ALTER TABLE events ADD COLUMN event_date TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN hidden INTEGER DEFAULT 0;
