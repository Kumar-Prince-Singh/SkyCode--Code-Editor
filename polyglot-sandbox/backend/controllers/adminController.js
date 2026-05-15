const Submission = require('../models/Submission');

// @desc    Get system-wide stats
// @route   GET /api/admin/stats
// @access  Private/Admin (Public for now)
const getStats = async (req, res, next) => {
    try {
        const totalSubmissions = await Submission.countDocuments();
        const successCount = await Submission.countDocuments({ status: 'success' });
        const failedCount = await Submission.countDocuments({ status: 'failed' });
        
        const langStats = await Submission.aggregate([
            { $group: { _id: "$language", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const recentSubmissions = await Submission.find()
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            data: {
                totalSubmissions,
                successCount,
                failedCount,
                langStats,
                recentSubmissions
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getStats };
