const asyncHandler = require('../utils/asyncHandler');
const { validateRegistration } = require('../validations/registrationValidation');
const registrationService = require('../services/registrationService');

// POST /api/register
const register = asyncHandler(async (req, res) => {
  const { errors, value } = validateRegistration(req.body);

  if (errors.length) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const { registration, count, maxTeams } = await registrationService.createRegistration(value);

  res.status(201).json({
    message: 'Registration successful',
    id: registration._id,
    count,
    maxTeams
  });
});

// GET /api/count
const getCount = asyncHandler(async (req, res) => {
  const { count, maxTeams } = await registrationService.getCount();
  res.json({ count, maxTeams });
});

module.exports = { register, getCount };
