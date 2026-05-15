const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { runCode, getSubmissions, getSubmissionById } = require('../controllers/runController');
const { getStats } = require('../controllers/adminController');
const { submissionLimiter } = require('../middleware/rateLimiter');

router.post('/run', protect, submissionLimiter, runCode);
router.get('/submissions', protect, getSubmissions);
router.get('/submissions/:id', protect, getSubmissionById);
router.get('/admin/stats', protect, getStats);

module.exports = router;
