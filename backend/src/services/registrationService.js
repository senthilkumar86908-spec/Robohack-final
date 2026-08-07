const Registration = require('../models/registrationModel');
const { appendRegistrationToSheet } = require('./googleSheetsService');

const MAX_TEAMS = parseInt(process.env.MAX_TEAMS || '30', 10);

async function getCount() {
  const count = await Registration.countDocuments();
  return { count, maxTeams: MAX_TEAMS };
}

/**
 * Creates a registration in MongoDB (the source of truth), then attempts to
 * mirror it into Google Sheets. MongoDB writes and Sheets writes are
 * deliberately NOT one atomic step:
 *
 *  - If Sheets is down/misconfigured, the team is still registered — we
 *    don't want a Google outage to block a hackathon signup.
 *  - `syncedToSheet` marks anything that didn't make it across, so
 *    `npm run resync-sheet` can retry just those later.
 */
async function createRegistration(payload) {
  const currentCount = await Registration.countDocuments();
  if (currentCount >= MAX_TEAMS) {
    const err = new Error('Registration is full.');
    err.status = 409;
    err.full = true;
    throw err;
  }

  const teamNameNormalized = payload.teamName.trim().toLowerCase();
  const leadEmailNormalized = payload.teamLead.email.trim().toLowerCase();

  const existing = await Registration.findOne({
    $or: [{ teamNameNormalized }, { 'teamLead.email': leadEmailNormalized }]
  }).lean();

  if (existing) {
    const err = new Error(
      existing.teamNameNormalized === teamNameNormalized
        ? 'A team with this name is already registered.'
        : 'This Gmail address is already registered with another team.'
    );
    err.status = 409;
    throw err;
  }

  const registration = await Registration.create({
    teamName: payload.teamName,
    teamNameNormalized,
    teamLead: {
      name: payload.teamLead.name,
      email: leadEmailNormalized,
      phone: payload.teamLead.phone
    },
    year: payload.year,
    dept: payload.dept,
    members: payload.members
  });

  try {
    await appendRegistrationToSheet(registration);
    registration.syncedToSheet = true;
    await registration.save();
  } catch (sheetErr) {
    // Deliberately swallowed: the registration itself already succeeded in
    // MongoDB. Log loudly so it's visible in server logs / Render logs.
    console.error(
      `[googleSheets] Failed to sync "${registration.teamName}" (id ${registration._id}):`,
      sheetErr.message
    );
  }

  const newCount = await Registration.countDocuments();
  return { registration, count: newCount, maxTeams: MAX_TEAMS };
}

module.exports = { getCount, createRegistration, MAX_TEAMS };
