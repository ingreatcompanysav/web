/**
 * In Great Company — RSVP → Google Sheet
 *
 * This is a Google Apps Script bound to the RSVP spreadsheet. The site's
 * /api/rsvp Cloudflare Function calls this web app server-side (the shared
 * token never reaches the browser) and it appends one row per RSVP.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 * 1. Open the Google Sheet that should collect RSVPs.
 * 2. Extensions → Apps Script. Delete the sample code, paste this file.
 * 3. Put a header row in the sheet (row 1). Any order works — this script
 *    matches on the header TEXT, not on column position:
 *      Timestamp | Event | First name | Last name | Email | Guests | Note
 *
 *    Upgrading an existing sheet: insert "First name" and "Last name" columns
 *    wherever you like (Sheets shifts the old rows for you) and the script
 *    starts filling them. A legacy "Name" column keeps being filled with the
 *    combined "first last", so you can keep it or delete it — either works.
 * 4. Set the shared secret: in Apps Script, Project Settings (gear) →
 *    Script properties → Add:  RSVP_TOKEN  =  <a long random string>
 *    (Use the SAME value for the Cloudflare env var APPS_SCRIPT_TOKEN.)
 * 5. Deploy → New deployment → type "Web app":
 *      - Description: RSVP endpoint
 *      - Execute as: Me (the owner)
 *      - Who has access: Anyone
 *    Deploy, authorize, and copy the Web app URL that ends in /exec.
 * 6. Put that URL in the Cloudflare env var APPS_SCRIPT_URL (Pages project →
 *    Settings → Environment variables), and in .dev.vars for local testing.
 *
 * Re-deploying after edits: Deploy → Manage deployments → edit → new version,
 * so the /exec URL stays the same.
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');

    var expected = PropertiesService.getScriptProperties().getProperty('RSVP_TOKEN');
    if (expected && body.token !== expected) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    appendByHeader_(sheet, {
      'timestamp': new Date(),
      'event': body.event_id || '',
      'first name': body.first_name || '',
      'last name': body.last_name || '',
      'name': body.name || '',
      'email': body.email || '',
      'guests': body.guests || 1,
      'note': body.note || ''
    });

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * Appends a row by matching the sheet's header text, so columns can be
 * reordered or inserted without touching this script — and so adding
 * First name/Last name to an existing sheet doesn't shift old rows out of line.
 * Falls back to a fixed legacy order only if row 1 is empty.
 */
function appendByHeader_(sheet, values) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    sheet.appendRow([values['timestamp'], values['event'], values['first name'],
                     values['last name'], values['email'], values['guests'], values['note']]);
    return;
  }
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = [];
  var matched = 0;
  for (var i = 0; i < lastCol; i++) {
    var key = String(headers[i]).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(values, key)) { row.push(values[key]); matched++; }
    else row.push('');
  }
  // An unrecognised header row would silently write a row of blanks, so fall
  // back to the legacy order rather than losing the RSVP.
  if (matched === 0) {
    sheet.appendRow([values['timestamp'], values['event'], values['first name'],
                     values['last name'], values['email'], values['guests'], values['note']]);
    return;
  }
  sheet.appendRow(row);
}

// Simple GET so you can eyeball that the deployment is live.
function doGet() {
  return json_({ ok: true, service: 'igc-rsvp' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
