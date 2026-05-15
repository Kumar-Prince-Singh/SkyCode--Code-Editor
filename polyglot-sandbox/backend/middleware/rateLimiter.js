const rateLimit = require('express-rate-limit');

const submissionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 submissions per minute
    message: {
        success: false,
        message: 'Too many submissions. Please wait a minute before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { submissionLimiter };
