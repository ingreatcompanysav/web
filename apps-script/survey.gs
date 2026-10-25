/**
 * In Great Company — gathering emails: follow-up surveys and 24h reminders
 *
 * Every morning at 9am (Savannah time) this asks the site which survey emails
 * are due — one per person who RSVP'd to a gathering that happened YESTERDAY
 * and has "Email the follow-up survey" ticked in the admin — and sends each
 * from this Google account's Gmail.
 *
 * Every hour it also asks which reminders are due — one per person who RSVP'd
 * to a gathering starting within the next 24 hours that has "Email a reminder"
 * ticked — and sends those the same way.
 *
 * The site, not this script, decides who is due, and it hands each person out
 * only once per gathering. Running either by hand, or twice, can't double-send.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 * 1. Signed in as the group's Gmail (ingreatcompanysavannah@gmail.com), go to
 *    script.google.com → New project. Name it "IGC survey emails". Delete the
 *    sample code and paste this file.
 * 2. Project Settings (gear):
 *      - Time zone: (GMT-05:00) Eastern Time - New York
 *      - Script properties → Add:
 *          SITE_URL     = https://ingreatcompanysav.com   (no trailing slash)
 *          SURVEY_TOKEN = <the same value as the Cloudflare env var APPS_SCRIPT_TOKEN>
 * 3. Back in the editor, pick installTrigger in the function menu and Run it
 *    once. Approve the permissions (send email as you, connect to an external
 *    service). That creates the daily 9am survey trigger and the hourly
 *    reminder trigger — check them under Triggers (the alarm-clock icon).
 *    Google fires the 9am one somewhere between 9 and 10am. Already set this
 *    up for surveys before reminders existed? Paste the new code and run
 *    installTrigger once more.
 * 4. To test: run sendDueSurveys by hand the morning after a ticked gathering,
 *    or sendDueReminders the day before one (or see SETUP.md for testing
 *    against a preview deploy).
 *
 * No web-app deployment is needed — this script only calls out, nothing calls in.
 * A personal Gmail can send about 100 emails a day this way — surveys and
 * reminders share that allowance.
 */

var SUBJECT = 'Thanks for coming to {event} — 2 minutes?';
var REMINDER_SUBJECT = 'See you tomorrow at {event}!';

function sendDueSurveys() {
  var props = PropertiesService.getScriptProperties();
  var site = props.getProperty('SITE_URL');
  var token = props.getProperty('SURVEY_TOKEN');
  if (!site || !token) throw new Error('Set SITE_URL and SURVEY_TOKEN in Project Settings → Script properties.');

  var due = call_(site, '/api/survey-due', { token: token, action: 'due' });
  var failed = [];
  due.surveys.forEach(function (s) {
    try {
      MailApp.sendEmail({
        to: s.email,
        subject: SUBJECT.replace('{event}', s.eventTitle),
        name: 'In Great Company',
        body: textBody_(s),
        htmlBody: htmlBody_(s),
      });
    } catch (err) {
      console.error('Could not email ' + s.email + ': ' + err);
      failed.push(s.token);
    }
  });
  // Hand back the ones that didn't go (quota, bad address) so running this
  // again by hand today retries just those.
  if (failed.length) call_(site, '/api/survey-due', { token: token, action: 'failed', tokens: failed });
  console.log('Surveys for ' + due.date + ': ' + (due.surveys.length - failed.length) + ' sent, ' + failed.length + ' failed.');
}

function sendDueReminders() {
  var props = PropertiesService.getScriptProperties();
  var site = props.getProperty('SITE_URL');
  var token = props.getProperty('SURVEY_TOKEN');
  if (!site || !token) throw new Error('Set SITE_URL and SURVEY_TOKEN in Project Settings → Script properties.');

  var due = call_(site, '/api/reminders-due', { token: token, action: 'due' });
  var failed = [];
  due.reminders.forEach(function (r) {
    try {
      MailApp.sendEmail({
        to: r.email,
        subject: REMINDER_SUBJECT.replace('{event}', r.eventTitle),
        name: 'In Great Company',
        body: reminderText_(r),
        htmlBody: reminderHtml_(r),
      });
    } catch (err) {
      console.error('Could not email ' + r.email + ': ' + err);
      failed.push({ eventId: r.eventId, email: r.email });
    }
  });
  if (failed.length) call_(site, '/api/reminders-due', { token: token, action: 'failed', reminders: failed });
  console.log('Reminders: ' + (due.reminders.length - failed.length) + ' sent, ' + failed.length + ' failed.');
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'sendDueSurveys' || fn === 'sendDueReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDueSurveys').timeBased().everyDays(1).atHour(9)
    .inTimezone('America/New_York').create();
  ScriptApp.newTrigger('sendDueReminders').timeBased().everyHours(1).create();
}

function call_(site, path, payload) {
  var res = UrlFetchApp.fetch(site + path, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var out = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200 || !out.ok) {
    throw new Error('Site said ' + res.getResponseCode() + ': ' + (out.error || res.getContentText().slice(0, 140)));
  }
  return out;
}

function textBody_(s) {
  return 'Hi ' + (s.firstName || 'there') + ',\n\n' +
    'Thank you for coming to ' + s.eventTitle + '! We would love to hear how it went — ' +
    'it takes about two minutes:\n\n' + s.url + '\n\n' +
    'See you at the next one,\nIn Great Company\n\n' +
    'You got this because you RSVP\'d to ' + s.eventTitle + '. ' +
    'To stop feedback emails: ' + s.optoutUrl;
}

function esc_(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function htmlBody_(s) {
  var esc = esc_;
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#03191B;max-width:520px">' +
    '<p>Hi ' + esc(s.firstName || 'there') + ',</p>' +
    '<p>Thank you for coming to <b>' + esc(s.eventTitle) + '</b>! We would love to hear how it went — it takes about two minutes.</p>' +
    '<p style="margin:28px 0"><a href="' + esc(s.url) + '" style="background:#EF2E9F;color:#03191B;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Share your thoughts</a></p>' +
    '<p>See you at the next one,<br>In Great Company</p>' +
    '<p style="font-size:12px;color:#5b6b6c;margin-top:32px">You got this because you RSVP\'d to ' + esc(s.eventTitle) + '. ' +
    '<a href="' + esc(s.optoutUrl) + '" style="color:#5b6b6c">Stop sending me feedback emails</a></p>' +
    '</div>';
}

function reminderText_(r) {
  return 'Hi ' + (r.firstName || 'there') + ',\n\n' +
    'Just a reminder that ' + r.eventTitle + ' is coming up' +
    (r.when ? ': ' + r.when : ' tomorrow') + (r.place ? ', at ' + r.place : '') + '.\n\n' +
    'All the details: ' + r.url + '\n\n' +
    'Can\'t make it after all? Just reply and let us know.\n\n' +
    'See you there,\nIn Great Company\n\n' +
    'You got this because you RSVP\'d to ' + r.eventTitle + '.';
}

function reminderHtml_(r) {
  var esc = esc_;
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#03191B;max-width:520px">' +
    '<p>Hi ' + esc(r.firstName || 'there') + ',</p>' +
    '<p>Just a reminder that <b>' + esc(r.eventTitle) + '</b> is coming up' + (r.when ? '' : ' tomorrow') + '.</p>' +
    (r.when ? '<p style="margin:0"><b>When:</b> ' + esc(r.when) + '</p>' : '') +
    (r.place ? '<p style="margin:0"><b>Where:</b> ' + esc(r.place) + '</p>' : '') +
    '<p style="margin:28px 0"><a href="' + esc(r.url) + '" style="background:#EF2E9F;color:#03191B;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">See the details</a></p>' +
    '<p>Can\'t make it after all? Just reply and let us know.</p>' +
    '<p>See you there,<br>In Great Company</p>' +
    '<p style="font-size:12px;color:#5b6b6c;margin-top:32px">You got this because you RSVP\'d to ' + esc(r.eventTitle) + '.</p>' +
    '</div>';
}
