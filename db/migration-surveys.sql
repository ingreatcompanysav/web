-- Follow-up surveys emailed to a gathering's RSVPs at 9am the day after
-- (see functions/api/survey-due.js and apps-script/survey.gs). Run once
-- against each database:
--   npx wrangler d1 execute igc --local  --file=./db/migration-surveys.sql
--   npx wrangler d1 execute igc --remote --file=./db/migration-surveys.sql
-- Re-running errors harmlessly on the ALTER with "duplicate column name";
-- run the statements after it by hand if that happens.

-- Ticked per gathering in the admin. Off unless someone ticks it.
ALTER TABLE events ADD COLUMN survey_auto INTEGER DEFAULT 0;

-- The one shared question set every survey uses.
--   * kind: rating (1-5) | text | longtext | choice | yesno
--   * options: one choice per line, used only by kind = choice
CREATE TABLE IF NOT EXISTS survey_questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL,
  kind        TEXT    DEFAULT 'text',
  options     TEXT    DEFAULT '',
  required    INTEGER DEFAULT 0,
  active      INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    DEFAULT (datetime('now'))
);

-- One row per person per gathering — the UNIQUE index is what guarantees
-- nobody is sent a second survey for the same gathering.
--   * token is the survey link's credential (128 random bits).
--   * sent_at is set when the row is handed to the mailer; a row that already
--     has one is never handed out again.
--   * answers is a JSON array of {id, label, answer}. The label is copied in so
--     editing a question later doesn't change what an old answer was to.
CREATE TABLE IF NOT EXISTS surveys (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     TEXT NOT NULL,
  email        TEXT NOT NULL,
  first_name   TEXT    DEFAULT '',
  token        TEXT NOT NULL,
  sent_at      TEXT,
  answers      TEXT,
  answered_at  TEXT,
  created_at   TEXT    DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_person ON surveys(event_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_token ON surveys(token);

-- A starting set the client can edit. Only seeded into an empty table.
INSERT INTO survey_questions (label, kind, options, required, sort_order)
SELECT * FROM (
  SELECT 'Overall, how was the gathering?', 'rating', '', 1, 0 UNION ALL
  SELECT 'What did you love?', 'longtext', '', 0, 1 UNION ALL
  SELECT 'What could have been better?', 'longtext', '', 0, 2 UNION ALL
  SELECT 'Would you come to another one?', 'yesno', '', 0, 3 UNION ALL
  SELECT 'Any ideas for future gatherings?', 'longtext', '', 0, 4
) WHERE NOT EXISTS (SELECT 1 FROM survey_questions);
