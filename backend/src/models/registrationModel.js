const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },

    // Lowercased, trimmed copy of teamName used purely for duplicate checks,
    // so "Circuit Breakers" and "circuit breakers" are treated as the same team.
    teamNameNormalized: { type: String, required: true, unique: true },

    teamLead: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true }
    },

    year: { type: String, required: true, enum: ['1', '2', '3', '4'] },
    dept: { type: String, required: true, trim: true },

    // Up to 3 optional teammates. Kept as a flat, fixed-shape array (never a
    // nested object-of-objects) so it maps 1:1 onto Google Sheet columns —
    // this is what caused the earlier n8n nested-array/flat-schema mismatch.
    members: {
      type: [memberSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= 3,
        message: 'A team can have at most 3 additional teammates.'
      }
    },

    // Flips to true once the row has been written to Google Sheets, so a
    // failed sheet call can be found and retried later without re-scanning
    // every registration.
    syncedToSheet: { type: Boolean, default: false }
  },
  { timestamps: true }
);

registrationSchema.index({ 'teamLead.email': 1 });

module.exports = mongoose.model('Registration', registrationSchema);
