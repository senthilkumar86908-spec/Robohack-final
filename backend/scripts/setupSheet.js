// Run once after creating the Google Sheet: npm run setup-sheet
// Writes the header row (Timestamp, Team Name, ... Mongo ID) to row 1.
require('dotenv').config();
const { ensureHeaderRow } = require('../src/services/googleSheetsService');

ensureHeaderRow()
  .then(() => {
    console.log('Header row written to the Google Sheet.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Could not write header row:', err.message);
    process.exit(1);
  });
