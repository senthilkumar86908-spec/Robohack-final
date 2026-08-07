function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const payload = { error: err.message || 'Something went wrong. Please try again.' };

  // Lets the frontend show its "registration full" state instead of a
  // generic error banner.
  if (err.full) payload.full = true;

  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
