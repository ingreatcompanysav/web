// /api/admin/events — GET (list all, including hidden/inactive) + POST (create).
// Columns and validation live in functions/_shared/resources.js.
//
// The list pulls from the subscribed Google Calendar first, the same as the
// public one, so "Reload from site" shows what the calendar just added.
import { collection } from '../../_shared/crud.js';
import * as calendar from '../../_shared/calendar.js';

const c = collection('events');

export const onRequestPost = c.onRequestPost;
export async function onRequestGet(ctx) {
  await calendar.syncCalendar(ctx.env);
  const res = await c.onRequestGet(ctx);
  res.headers.set('x-calendar-sync', calendar.status);
  return res;
}
