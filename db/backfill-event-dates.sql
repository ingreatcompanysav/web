-- One-time backfill: give the 9 pre-existing gatherings a real event_date so
-- they auto-place as upcoming/past. Years confirmed 2026 (each display weekday
-- matches the 2026 calendar date). Events created/edited in admin after this
-- already store their own event_date via the date picker, so this is only
-- needed once for rows that predate the feature.
--
-- Apply:  npx wrangler d1 execute igc --remote --file=./db/backfill-event-dates.sql
--
-- Safe to re-run (idempotent UPDATEs by id).
UPDATE events SET event_date='2026-08-15' WHERE id='bookclubaugust26';
UPDATE events SET event_date='2026-08-18' WHERE id='paintsipaugust26';
UPDATE events SET event_date='2026-08-26' WHERE id='walkandtalkagust26';
UPDATE events SET event_date='2026-08-28' WHERE id='outofthebluehappyhour26';
UPDATE events SET event_date='2026-09-01' WHERE id='tacotuesdaysept26';
UPDATE events SET event_date='2026-09-10' WHERE id='sharktoothtoursept26';
UPDATE events SET event_date='2026-09-12' WHERE id='shesgamesept26';
UPDATE events SET event_date='2026-09-12' WHERE id='bookclubsept26';
UPDATE events SET event_date='2026-09-15' WHERE id='happy';
