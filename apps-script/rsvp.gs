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
 * 3. Put a header row in the sheet (row 1), e.g.:
 *      Timestamp | Event | Name | Email | Guests | Note
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
    sheet.appendRow([
      new Date(),
      body.event_id || '',
      body.name || '',
      body.email || '',
      body.guests || 1,
      body.note || ''
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
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
