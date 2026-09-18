// Google Calendar → gatherings. The site subscribes to the group's calendar
// feed (CALENDAR_ICS_URL, the "address in iCal format" from the calendar's
// settings) and publishes what it finds there.
//
// Pages has no cron, so this runs on demand: /api/events and /api/admin/events
// call syncCalendar() before listing, and it really fetches at most once every
// INTERVAL per isolate. Google itself refreshes a calendar's feed only every
// few hours, so "automatic" means within a few hours of the calendar edit.
//
// The rules:
//   * a calendar event is tied to its row by calendar_uid. The first time it is
//     seen, an unlinked row on the same date whose title starts the same way is
//     adopted instead of created, so hand-entered gatherings don't get a twin;
//   * rows are created only for upcoming events — the site keeps its own past,
//     the calendar's history is not copied in;
//   * the calendar owns title, date, time, place, blurb, detail and the
//     Facebook link, and rewrites them only when it changed after the row was
//     last saved (LAST-MODIFIED vs updated_at). Edit in either place; the later
//     edit wins. Photo, tone, category, price and the ticket link are the
//     site's own and are never touched;
//   * an upcoming event that leaves the calendar (or is cancelled) is hidden,
//     not deleted, and the sync never un-hides — so hiding a synced gathering
//     sticks. Deleting one does not: it comes back on the next sync while it is
//     still on the calendar.

const INTERVAL_MS = 10 * 60 * 1000;
const TZ = 'America/New_York';

let nextRun = 0;
let running = null;
// What the last attempt in this isolate did, for the x-calendar-sync header
// on the events lists — the only window into a sync that fails quietly.
export let status = 'not yet run';

export function syncCalendar(env) {
  if (!env.CALENDAR_ICS_URL) { status = 'off: CALENDAR_ICS_URL is not set'; return Promise.resolve(); }
  if (running) return running;
  if (Date.now() < nextRun) return Promise.resolve();
  nextRun = Date.now() + INTERVAL_MS;
  running = sync(env)
    .then((n) => { status = `ok at ${new Date().toISOString()}: ${n} calendar events`; })
    .catch((e) => {
      status = `failed at ${new Date().toISOString()}: ${e.message}`;
      console.log('calendar sync', status);
      nextRun = Date.now() + 60 * 1000;   // a failure is worth retrying soon
    })
    .finally(() => { running = null; });
  return running;
}

async function sync(env) {
  const res = await fetch(env.CALENDAR_ICS_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`feed answered ${res.status}`);
  const feed = parseIcs(await res.text())
    .map((ev) => gathering(ev))
    .filter(Boolean)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  // An empty feed is far more likely a bad fetch than a cleared calendar, and
  // acting on it would hide every synced gathering.
  if (!feed.length) return 0;

  const todayIso = ymd(local(Date.now()));
  const { results: rows } = await env.DB.prepare(
    'SELECT id, title, event_date, calendar_uid, updated_at, sort_order FROM events'
  ).all();
  const seen = new Set();

  for (const { uid, cancelled, modified, ...g } of feed) {
    if (cancelled) continue;
    seen.add(uid);
    const row = rows.find((r) => r.calendar_uid === uid) || adoptable(rows, g);
    if (!row) {
      if (g.event_date >= todayIso) await insert(env, rows, g, uid);
      continue;
    }
    const calendarIsNewer = modified > (row.updated_at || '');
    if (row.calendar_uid && !calendarIsNewer) continue;
    // Only what the calendar actually has: a blank description or location
    // must not wipe something typed in the admin.
    const cols = calendarIsNewer ? Object.keys(g).filter((k) => g[k] !== '') : [];
    await env.DB.prepare(
      `UPDATE events SET ${cols.map((c) => `${c} = ?, `).join('')}calendar_uid = ?,
         updated_at = datetime('now') WHERE id = ?`
    ).bind(...cols.map((c) => g[c]), uid, row.id).run();
    Object.assign(row, g, { calendar_uid: uid });
  }

  for (const r of rows) {
    if (r.calendar_uid && !seen.has(r.calendar_uid) && r.event_date >= todayIso) {
      await env.DB.prepare('UPDATE events SET hidden = 1 WHERE id = ?').bind(r.id).run();
    }
  }
  return feed.length;
}

// A hand-entered gathering on the same day whose title starts the same way
// ("The Witching Hour" for "The Witching Hour (October Happy Hour)").
function adoptable(rows, g) {
  const s = slug(g.title);
  return s && rows.find((r) => {
    const t = slug(r.title);
    return !r.calendar_uid && r.event_date === g.event_date && t && (t.startsWith(s) || s.startsWith(t));
  });
}

// New rows slot in among the dated ones by date, so a gathering added to the
// calendar shows up where it belongs rather than at the end of the list.
async function insert(env, rows, g, uid) {
  const base = `${g.event_date}-${slug(g.title)}`;
  let id = base;
  for (let n = 2; rows.some((r) => r.id === id); n++) id = `${base}-${n}`;
  const sort = 1 + rows.reduce(
    (m, r) => (r.event_date && r.event_date <= g.event_date ? Math.max(m, r.sort_order) : m), -1
  );
  const cols = Object.keys(g);
  await env.DB.batch([
    env.DB.prepare('UPDATE events SET sort_order = sort_order + 1 WHERE sort_order >= ?').bind(sort),
    env.DB.prepare(
      `INSERT INTO events (id, calendar_uid, sort_order, ${cols.join(', ')})
       VALUES (?, ?, ?, ${cols.map(() => '?').join(', ')})`
    ).bind(id, uid, sort, ...cols.map((c) => g[c])),
  ]);
  for (const r of rows) if (r.sort_order >= sort) r.sort_order++;
  rows.push({ id, calendar_uid: uid, sort_order: sort, ...g });
}

/* ----------------------------------------------------- feed → gathering */
// A VEVENT as the row it would become, plus what the sync needs to place it.
// Null when there's nothing to publish (no title or no date).
function gathering(ev) {
  const get = (k) => (ev[k] ? ev[k].value : '');
  const when = icsWhen(ev.DTSTART);
  const title = get('SUMMARY').trim();
  if (!title || !when) return null;

  const desc = get('DESCRIPTION')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // The event's own Facebook link belongs in the link field, not the write-up.
  const facebook_url = (desc.match(/https:\/\/(?:www\.)?facebook\.com\/events\/\S+/) || [''])[0];
  const [blurb, ...rest] = desc.replace(/^Facebook event:.*$/im, '').trim().split(/\n\s*\n/);

  return {
    uid: get('UID'),
    cancelled: get('STATUS') === 'CANCELLED',
    // "20260910T163552Z" → "2026-09-10 16:35:52", the shape of updated_at.
    modified: get('LAST-MODIFIED').replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3 $4:$5:$6'),
    title,
    event_date: when.iso,
    date: new Date(when.iso + 'T12:00:00Z')
      .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    time: when.time,
    // "Venue, Street, Savannah, GA" → "Venue, Street", the form's own habit.
    place: get('LOCATION').split(', ').filter((p) => !/^(savannah|ga(\s+\d{5})?|usa)$/i.test(p)).slice(0, 2).join(', '),
    blurb: blurb.trim(),
    detail: rest.join('\n\n').trim(),
    facebook_url,
  };
}

// Minimal iCalendar reader: unfolds wrapped lines, keeps each VEVENT's
// properties as { value, params }, unescapes text.
function parseIcs(text) {
  const events = [];
  let cur = null;
  for (const line of text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    const m = cur && line.match(/^([A-Z-]+)((?:;[^:]*)?):(.*)$/);
    if (m) cur[m[1]] = { params: m[2], value: m[3].replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1') };
  }
  return events;
}

// DTSTART → the same moment on Savannah's clock, as { iso, time }. Google's
// feed gives UTC ("...Z"); a bare wall-clock value (all-day, or TZID — the
// calendar's own zone) is taken as already local.
function icsWhen(prop) {
  const m = ((prop && prop.value) || '').match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{0,2}(Z?))?$/);
  if (!m) return null;
  let [, y, mo, d, h, mi, utc] = m;
  if (!h) return { iso: `${y}-${mo}-${d}`, time: '' };
  if (utc) ({ y, mo, d, h, mi } = local(Date.UTC(+y, +mo - 1, +d, +h, +mi)));
  return { iso: `${y}-${mo}-${d}`, time: `${h % 12 || 12}:${mi}${h < 12 ? 'am' : 'pm'}` };
}

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
function local(ms) {
  const p = {};
  for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
  return { y: p.year, mo: p.month, d: p.day, h: +p.hour, mi: p.minute };
}
const ymd = ({ y, mo, d }) => `${y}-${mo}-${d}`;

// Same slug the admin makes, so ids match hand-entered gatherings.
const slug = (s) => String(s).toLowerCase().trim()
  .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
