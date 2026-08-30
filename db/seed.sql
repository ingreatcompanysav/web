-- In Great Company — initial data, migrated from events.json + the hard-coded
-- `voices` array that used to live in index.html's template blob.
-- Apply AFTER schema.sql:
--   npx wrangler d1 execute igc --local  --file=./db/seed.sql
--   npx wrangler d1 execute igc --remote --file=./db/seed.sql
-- Idempotent: clears the three tables first so re-seeding is safe.

DELETE FROM events;
DELETE FROM quotes;

-- Events (from events.json) --------------------------------------------------
INSERT INTO events
  (id, title, date, time, place, category, tone, price, stripe_url, facebook_url, blurb, detail, note, sort_order)
VALUES
  ('octoberwalkandtalk', 'October Walk & Talk', 'Sun, Aug 2', '1:00am', 'Foxy Loxy', 'Free', 'cyan', 0, '', '', '', '', '', 0);

-- Quotes (from the `voices` array) -------------------------------------------
INSERT INTO quotes (name, detail, tone, body, active, sort_order) VALUES
  ('Danielle', 'moved here in January', 'cream',
   'I came to a coffee thing alone on a Sunday and now I have people I text about nothing.', 1, 0),
  ('Victoria', 'came alone in May', 'deep',
   'This group has been such a blessing since I moved; They’ve created a welcoming, supportive community with fun events and a safe space that helped me get out, explore the city, and build friendships when I didn’t know anyone.', 1, 1),
  ('Jo', 'here twelve years', 'cream',
   'Twelve years in Savannah and I found the hidden gems with these women, not before them.', 1, 2);

-- Links (the /links page) ----------------------------------------------------
-- Only seeds an EMPTY table, unlike the events/quotes blocks above: these are
-- edited from the admin's Links tab, and re-running the seed must not wipe the
-- client's own list. (This block used to live in db/migration-links.sql.)
INSERT INTO links (label, url, subtitle, icon, tone, active, sort_order)
SELECT * FROM (
  SELECT 'Follow us on Instagram' AS label, 'https://www.instagram.com/ingreatcompanysav' AS url,
         '@ingreatcompanysav' AS subtitle, 'instagram' AS icon, 'rose' AS tone, 1 AS active, 0 AS sort_order
  UNION ALL SELECT 'Join the Facebook group', 'https://www.facebook.com/groups/ingreatcompanysav',
         'Where the day-to-day chatter happens', 'facebook', 'cyan', 1, 1
  UNION ALL SELECT 'See upcoming gatherings', 'https://ingreatcompanysav.com/#gatherings',
         'Coffee, dinners, walks — all of it', 'calendar', 'gold', 1, 2
  UNION ALL SELECT 'Email us', 'mailto:contact@ingreatcompanysav.com',
         'contact@ingreatcompanysav.com', 'email', 'cream', 1, 3
) WHERE NOT EXISTS (SELECT 1 FROM links);
