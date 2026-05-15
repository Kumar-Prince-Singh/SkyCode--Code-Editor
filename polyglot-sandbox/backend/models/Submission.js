const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    language: {
        type: String,
        required: true,
        enum: ["cpp", "python", "java", "javascript"]
    },
    code: {
        type: String,
        required: true
    },
    input: {
        type: String,
        default: ""
    },
    output: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['queued', 'processing', 'success', 'failed', 'timeout'],
        default: 'queued'
    },
    executionTime: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Submission', submissionSchema);
