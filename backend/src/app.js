const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const registrationRoute = require('./routes/registrationRoute');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// CORS_ORIGIN in .env is a comma-separated allowlist, e.g.
// "https://robohack.mailamengg.ac.in,http://127.0.0.1:5500"
// Use "*" only for local testing.
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins
  })
);

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ROBOHACK registration backend' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api', registrationRoute);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
