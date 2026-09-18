// GET /api/events — public. Everything except hidden (draft/cancelled) events,
// each flagged past or upcoming. See the `events` entry in _shared/resources.js
// for the visibility rule and the timezone shift behind that flag.
//
// Listing first pulls anything new from the Google Calendar the site
// subscribes to (see _shared/calendar.js) — that is what makes calendar
// events publish themselves.
import { publicList } from '../_shared/crud.js';
import * as calendar from '../_shared/calendar.js';

const list = publicList('events').onRequestGet;

export async function onRequestGet(ctx) {
  await calendar.syncCalendar(ctx.env);
  const res = await list(ctx);
  // `curl -s -D - -o /dev/null /api/events` shows whether the sync is working.
  res.headers.set('x-calendar-sync', calendar.status);
  return res;
}
