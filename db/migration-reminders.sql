-- Reminder emails sent to a gathering's RSVPs about 24 hours before it starts
-- (see functions/api/reminders-due.js and apps-script/survey.gs). Run once
-- against each database:
--   npx wrangler d1 execute igc --local  --file=./db/migration-reminders.sql
--   npx wrangler d1 execute igc --remote --file=./db/migration-reminders.sql
-- Re-running errors harmlessly on the ALTER with "duplicate column name";
-- run the CREATE statements after it by hand if that happens.

-- Ticked per gathering in the admin. Off unless someone ticks it.
ALTER TABLE events ADD COLUMN remind_auto INTEGER DEFAULT 0;

-- One row per person per gathering, written the moment the reminder is handed
-- to the mailer. The UNIQUE index is what stops anyone being reminded twice.
CREATE TABLE IF NOT EXISTS reminders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    TEXT NOT NULL,
  email       TEXT NOT NULL,
  sent_at     TEXT    DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_person ON reminders(event_id, email);
