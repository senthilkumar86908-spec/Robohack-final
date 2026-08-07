// Finds every registration stored in MongoDB that never made it into the
// Google Sheet (e.g. because Sheets was down or misconfigured at the time)
// and retries them one by one. Run with: npm run resync-sheet
require('dotenv').config();

const connectDB = require('../src/config/database');
const Registration = require('../src/models/registrationModel');
const { appendRegistrationToSheet } = require('../src/services/googleSheetsService');

(async () => {
  await connectDB();

  const pending = await Registration.find({ syncedToSheet: false }).sort({ createdAt: 1 });
  console.log(`Found ${pending.length} registration(s) missing from the sheet.`);

  let synced = 0;
  for (const reg of pending) {
    try {
      await appendRegistrationToSheet(reg);
      reg.syncedToSheet = true;
      await reg.save();
      synced += 1;
      console.log(`  synced: ${reg.teamName}`);
    } catch (err) {
      console.error(`  still failing: ${reg.teamName} -> ${err.message}`);
    }
  }

  console.log(`Done. ${synced}/${pending.length} synced.`);
  process.exit(0);
})().catch((err) => {
  console.error('resync-sheet crashed:', err.message);
  process.exit(1);
});
