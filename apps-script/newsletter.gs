/**
 * In Great Company — Newsletter signups → Google Sheet
 *
 * Bound to the NEWSLETTER spreadsheet (a different sheet from the RSVP one).
 * The site's /api/subscribe and /api/unsubscribe Functions call this web app
 * server-side, so the shared token never reaches the browser.
 *
 * Two actions:
 *   subscribe   — append a new row, or revive the existing row for that email
 *   unsubscribe — find the row by email and mark it Unsubscribed
 *                 (or whatever `status` the caller sends, e.g. Removed)
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 * 1. Create a NEW Google Sheet for the newsletter list.
 * 2. Put this header row in row 1, in this order:
 *      Timestamp | First name | Last name | Email | Status | Source | Unsubscribe link
 * 3. Extensions → Apps Script. Delete the sample code, paste this file.
 * 4. Project Settings (gear) → Script properties → Add:
 *      RSVP_TOKEN = <the same long random string used by the RSVP script>
 *    (It must match the Cloudflare env var APPS_SCRIPT_TOKEN.)
 * 5. Deploy → New deployment → type "Web app":
 *      - Execute as: Me (the owner)
 *      - Who has access: Anyone
 *    Deploy, authorize, copy the Web app URL ending in /exec.
 * 6. Put that URL in the Cloudflare env var APPS_SCRIPT_NEWSLETTER_URL
 *    (Pages project → Settings → Environment variables), and in .dev.vars.
 *
 * Re-deploying after edits: Deploy → Manage deployments → edit → new version,
 * so the /exec URL stays the same.
 */

var EMAIL_COL = 4;   // D
var STATUS_COL = 5;  // E

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');

    var expected = PropertiesService.getScriptProperties().getProperty('RSVP_TOKEN');
    if (expected && body.token !== expected) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var email = String(body.email || '').toLowerCase();
    if (!email) return json_({ ok: false, error: 'email_required' });

    var row = findRowByEmail_(sheet, email);

    if (body.action === 'unsubscribe') {
      if (!row) return json_({ ok: true, note: 'not_in_sheet' });
      sheet.getRange(row, STATUS_COL).setValue(body.status || 'Unsubscribed');
      return json_({ ok: true });
    }

    // subscribe: revive an existing row so re-signups don't duplicate.
    if (row) {
      sheet.getRange(row, 2).setValue(body.first_name || '');
      sheet.getRange(row, 3).setValue(body.last_name || '');
      sheet.getRange(row, STATUS_COL).setValue(body.status || 'Subscribed');
      if (body.unsubscribe_url) sheet.getRange(row, 7).setValue(body.unsubscribe_url);
      return json_({ ok: true, updated: true });
    }

    sheet.appendRow([
      new Date(),
      body.first_name || '',
      body.last_name || '',
      email,
      body.status || 'Subscribed',
      body.source || '',
      body.unsubscribe_url || ''
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Row number for an email, or 0. Reads the email column in one call rather than
// cell-by-cell so a long list doesn't blow the Apps Script time limit.
function findRowByEmail_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var values = sheet.getRange(2, EMAIL_COL, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === email) return i + 2;
  }
  return 0;
}

// Simple GET so you can eyeball that the deployment is live.
function doGet() {
  return json_({ ok: true, service: 'igc-newsletter' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
