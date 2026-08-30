-- Drops two vestigial columns from `events`.
--
-- `active` and `status` predate the current model and exist only in the remote
-- database — they were added by an early ALTER and never made it into
-- db/schema.sql, so a database rebuilt from the schema did not match production.
-- Nothing reads or writes them: the INSERT in functions/api/admin/events.js and
-- the UPDATE in functions/api/admin/events/[id].js both omit them, and neither
-- eventToPublic nor eventToAdmin exposes them.
--
-- They are also actively misleading — visibility is controlled by `hidden`, and
-- upcoming/past is derived from `event_date`, not by `active`/`status`.
--
-- Apply:  npx wrangler d1 execute igc --local  --file=./db/migration-drop-legacy-event-columns.sql
--         npx wrangler d1 execute igc --remote --file=./db/migration-drop-legacy-event-columns.sql
--
-- NOT re-runnable: SQLite has no DROP COLUMN IF EXISTS, so a second run errors
-- with "no such column". That is harmless — it means the drop already happened.

ALTER TABLE events DROP COLUMN active;
ALTER TABLE events DROP COLUMN status;
