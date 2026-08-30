-- Splits RSVP names into first/last, to match the newsletter signup form.
--
-- Apply:  npx wrangler d1 execute igc --local  --file=./db/migration-rsvp-names.sql
--         npx wrangler d1 execute igc --remote --file=./db/migration-rsvp-names.sql
--
-- The existing `name` column STAYS. It is NOT NULL, the Google Sheet and the
-- admin CSV already use it, and dropping a column is irreversible — so the API
-- keeps writing it as "first last" while first_name/last_name become the fields
-- people actually fill in.
--
-- NOT re-runnable as a whole: SQLite has no ADD COLUMN IF NOT EXISTS, so a
-- second run errors with "duplicate column name". That is harmless — it means
-- the columns are already there. The backfill below is guarded and idempotent.

ALTER TABLE rsvps ADD COLUMN first_name TEXT DEFAULT '';
ALTER TABLE rsvps ADD COLUMN last_name  TEXT DEFAULT '';

-- Backfill historic rows by splitting on the FIRST space: "Mary Anne Smith"
-- becomes first="Mary", last="Anne Smith". Single-word names keep an empty last
-- name. Only touches rows not already split, so it is safe to re-run.
UPDATE rsvps
SET first_name = CASE
      WHEN instr(trim(name), ' ') > 0
        THEN substr(trim(name), 1, instr(trim(name), ' ') - 1)
      ELSE trim(name)
    END,
    last_name = CASE
      WHEN instr(trim(name), ' ') > 0
        THEN ltrim(substr(trim(name), instr(trim(name), ' ') + 1))
      ELSE ''
    END
WHERE COALESCE(first_name, '') = '';
