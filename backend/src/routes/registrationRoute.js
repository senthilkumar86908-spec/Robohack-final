const express = require('express');
const router = express.Router();

const { register, getCount } = require('../controllers/registrationController');
const rateLimit = require('../middleware/rateLimitMiddleware');

router.post('/register', rateLimit, register);
router.get('/count', getCount);

module.exports = router;
