/**
 * In Great Company — follow-up survey emails
 *
 * Every morning at 9am (Savannah time) this asks the site which survey emails
 * are due — one per person who RSVP'd to a gathering that happened YESTERDAY
 * and has "Email the follow-up survey" ticked in the admin — and sends each
 * from this Google account's Gmail.
 *
 * The site, not this script, decides who is due, and it hands each person out
 * only once per gathering. Running this by hand, or twice, can't double-send.
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
 *    service). That creates the daily 9am trigger — check it under Triggers
 *    (the alarm-clock icon). Google fires it somewhere between 9 and 10am.
 * 4. To test: run sendDueSurveys by hand the morning after a ticked gathering
 *    (or see SETUP.md for testing against a preview deploy).
 *
 * No web-app deployment is needed — this script only calls out, nothing calls in.
 * A personal Gmail can send about 100 emails a day this way.
 */

var SUBJECT = 'Thanks for coming to {event} — 2 minutes?';

function sendDueSurveys() {
  var props = PropertiesService.getScriptProperties();
  var site = props.getProperty('SITE_URL');
  var token = props.getProperty('SURVEY_TOKEN');
  if (!site || !token) throw new Error('Set SITE_URL and SURVEY_TOKEN in Project Settings → Script properties.');

  var due = call_(site, { token: token, action: 'due' });
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
  if (failed.length) call_(site, { token: token, action: 'failed', tokens: failed });
  console.log('Surveys for ' + due.date + ': ' + (due.surveys.length - failed.length) + ' sent, ' + failed.length + ' failed.');
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDueSurveys') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDueSurveys').timeBased().everyDays(1).atHour(9)
    .inTimezone('America/New_York').create();
}

function call_(site, payload) {
  var res = UrlFetchApp.fetch(site + '/api/survey-due', {
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

function htmlBody_(s) {
  var esc = function (v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#03191B;max-width:520px">' +
    '<p>Hi ' + esc(s.firstName || 'there') + ',</p>' +
    '<p>Thank you for coming to <b>' + esc(s.eventTitle) + '</b>! We would love to hear how it went — it takes about two minutes.</p>' +
    '<p style="margin:28px 0"><a href="' + esc(s.url) + '" style="background:#EF2E9F;color:#03191B;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Share your thoughts</a></p>' +
    '<p>See you at the next one,<br>In Great Company</p>' +
    '<p style="font-size:12px;color:#5b6b6c;margin-top:32px">You got this because you RSVP\'d to ' + esc(s.eventTitle) + '. ' +
    '<a href="' + esc(s.optoutUrl) + '" style="color:#5b6b6c">Stop sending me feedback emails</a></p>' +
    '</div>';
}
