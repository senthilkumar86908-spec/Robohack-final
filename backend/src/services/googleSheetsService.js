const { google } = require('googleapis');

let cachedSheetsClient = null;

/**
 * Lazily builds and caches an authenticated Sheets API client using a
 * Google service account (JWT auth). No OAuth consent screen, no n8n —
 * this backend talks to Sheets directly.
 */
function getSheetsClient() {
  if (cachedSheetsClient) return cachedSheetsClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Private keys are stored in .env as a single line with literal \n escapes
  // (that's how Render/Railway/Vercel env vars work); convert them back to
  // real newlines before handing the key to the JWT client.
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error(
      'Google Sheets credentials missing: set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in backend/.env.'
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  cachedSheetsClient = google.sheets({ version: 'v4', auth });
  return cachedSheetsClient;
}

/**
 * The single place that turns a registration document into a spreadsheet
 * row. Every column is written explicitly and in a fixed order — there is
 * no automatic object->row mapping step (that's exactly what broke before:
 * a workflow tool tried to flatten a nested `members` array on its own and
 * got the field mapping wrong). If you add a field to the form, add its
 * column here AND in the header row in ensureHeaderRow below.
 */
function toRow(registration) {
  const members = registration.members || [];
  const member = (i) => members[i] || { name: '', email: '', phone: '' };

  return [
    new Date(registration.createdAt || Date.now()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata'
    }),
    registration.teamName,
    registration.teamLead.name,
    registration.teamLead.email,
    registration.teamLead.phone,
    registration.year,
    registration.dept,
    member(0).name,
    member(0).email,
    member(0).phone,
    member(1).name,
    member(1).email,
    member(1).phone,
    member(2).name,
    member(2).email,
    member(2).phone,
    String(registration._id)
  ];
}

const SHEET_RANGE = 'A:Q'; // 17 columns — matches toRow() above

function targetTab() {
  return process.env.GOOGLE_SHEET_TAB || 'Registrations';
}

/**
 * Appends one registration as a new row. Throws on failure — the caller
 * (registrationService) decides whether that should block the request or
 * just be logged for a later retry.
 */
async function appendRegistrationToSheet(registration) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID is not set in backend/.env.');
  }

  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${targetTab()}!${SHEET_RANGE}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [toRow(registration)] }
  });
}

/**
 * Writes the header row once. Safe to run any time (it overwrites row 1
 * with the same values) — call it via `npm run setup-sheet`.
 */
async function ensureHeaderRow() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID is not set in backend/.env.');
  }

  const sheets = getSheetsClient();

  const header = [
    'Timestamp',
    'Team Name',
    'Lead Name',
    'Lead Email',
    'Lead Phone',
    'Year',
    'Department',
    'Member 1 Name',
    'Member 1 Email',
    'Member 1 Phone',
    'Member 2 Name',
    'Member 2 Email',
    'Member 2 Phone',
    'Member 3 Name',
    'Member 3 Email',
    'Member 3 Phone',
    'Mongo ID'
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${targetTab()}!A1:Q1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header] }
  });
}

module.exports = { appendRegistrationToSheet, ensureHeaderRow, toRow };
