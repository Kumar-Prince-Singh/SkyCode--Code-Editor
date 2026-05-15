const { Queue } = require('bullmq');
const connection = require('../config/redis');

const submissionQueue = new Queue('submission-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

const addSubmissionToQueue = async (data) => {
    return await submissionQueue.add('execute-code', data);
};

module.exports = { submissionQueue, addSubmissionToQueue };
