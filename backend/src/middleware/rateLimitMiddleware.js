const rateLimit = require('express-rate-limit');

// Caps registration attempts per IP: 8 tries per 10 minutes is generous for
// a real student fixing typos, but stops a script from flooding the sheet.
module.exports = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
});
