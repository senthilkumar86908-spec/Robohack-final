function isGmail(v) {
  return /^[^\s@]+@gmail\.com$/i.test(String(v || '').trim());
}

function isPhone(v) {
  return /^[6-9]\d{9}$/.test(String(v || '').trim());
}

/**
 * Validates + normalizes the raw request body. Never trusts the client:
 * re-checks everything the frontend already checked, because the frontend
 * check is just UX — this is the real gate.
 *
 * Returns { errors, value }. If errors.length > 0, value should be ignored.
 */
function validateRegistration(body) {
  const errors = [];
  const b = body || {};

  const teamName = String(b.teamName || '').trim();
  const teamLead = b.teamLead || {};
  const leadName = String(teamLead.name || '').trim();
  const leadEmail = String(teamLead.email || '').trim();
  const leadPhone = String(teamLead.phone || '').trim();
  const year = String(b.year || '').trim();
  const dept = String(b.dept || '').trim();
  const membersRaw = Array.isArray(b.members) ? b.members.slice(0, 3) : [];

  if (!teamName) errors.push('Team name is required.');
  if (teamName.length > 80) errors.push('Team name is too long.');

  if (!leadName) errors.push("Team lead's name is required.");
  if (!isGmail(leadEmail)) errors.push('A valid Gmail address is required for the team lead.');
  if (!isPhone(leadPhone)) errors.push("A valid 10-digit phone number is required for the team lead.");

  if (!['1', '2', '3', '4'].includes(year)) errors.push('Year of study is required.');
  if (!dept) errors.push('Department is required.');

  const members = membersRaw.map((m) => ({
    name: String((m && m.name) || '').trim(),
    email: String((m && m.email) || '').trim(),
    phone: String((m && m.phone) || '').trim()
  }));

  members.forEach((m, i) => {
    if (m.email && !isGmail(m.email)) {
      errors.push(`Teammate ${i + 1}'s email must be a valid Gmail address.`);
    }
    if (m.phone && !isPhone(m.phone)) {
      errors.push(`Teammate ${i + 1}'s phone number must be a valid 10-digit number.`);
    }
  });

  const value = {
    teamName,
    teamLead: { name: leadName, email: leadEmail, phone: leadPhone },
    year,
    dept,
    members: members.filter((m) => m.name || m.email || m.phone)
  };

  return { errors, value };
}

module.exports = { validateRegistration, isGmail, isPhone };
