const Submission = require('../models/Submission');
const { addSubmissionToQueue } = require('../queue/submissionQueue');
const { emitProgress } = require('../services/socketService');

// @desc    Run code submission (Phase 3 Async)
// @route   POST /api/run
// @access  Public
const runCode = async (req, res, next) => {
    try {
        const { language, code, input } = req.body;

        if (!language || !code) {
            res.status(400);
            throw new Error('Please provide language and code');
        }

        // 1. Create initial submission in DB
        const submission = await Submission.create({
            user: req.user._id,
            language,
            code,
            input,
            status: 'queued'
        });

        // 2. Add to BullMQ Queue
        await addSubmissionToQueue({
            submissionId: submission._id.toString(),
            userId: req.user._id.toString(),
            language,
            code,
            input
        });

        // 3. Emit initial status
        emitProgress(submission._id.toString(), 'queued', 'Submission added to queue...');

        // 4. Return immediately
        res.status(202).json({
            success: true,
            status: 'queued',
            submissionId: submission._id,
            message: 'Execution started'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get execution status/history
// @route   GET /api/submissions
// @access  Public
const getSubmissions = async (req, res, next) => {
    try {
        const query = req.user.role === 'admin' ? {} : { 
            $or: [
                { user: req.user._id },
                { user: { $exists: false } }
            ]
        };
        const submissions = await Submission.find(query).sort({ createdAt: -1 }).limit(10);
        res.status(200).json({
            success: true,
            count: submissions.length,
            data: submissions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single submission
// @route   GET /api/submissions/:id
// @access  Public
const getSubmissionById = async (req, res, next) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            res.status(404);
            throw new Error('Submission not found');
        }

        // Security check: Only allow owner or admin
        if (req.user.role !== 'admin' && submission.user && submission.user.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to view this submission');
        }

        res.status(200).json({
            success: true,
            data: submission
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    runCode,
    getSubmissions,
    getSubmissionById
};
