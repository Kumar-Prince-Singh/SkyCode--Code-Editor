const { Worker } = require('bullmq');
const connection = require('../config/redis');
const dockerService = require('../services/dockerService');
const Submission = require('../models/Submission');
const { emitProgress } = require('../services/socketService');

const worker = new Worker('submission-queue', async (job) => {
    const { submissionId, userId, language, code, input } = job.data;
    
    console.log(`Processing submission: ${submissionId} for user: ${userId}`);
    
    try {
        const submission = await Submission.findById(submissionId);
        if (!submission) return;

        emitProgress(submissionId, 'processing', 'Container initializing...');
        emitProgress(`user_${userId}`, 'processing', 'Container initializing...');
        
        // Execute code in Docker
        const result = await dockerService.executeCode(language, code, input);
        
        // Update Submission metadata
        submission.executionTime = result.executionTime;
        
        if (result.compileError) {
            submission.status = 'failed';
            submission.output = result.compileError;
        } else if (result.runtimeError) {
            submission.status = 'failed';
            submission.output = result.runtimeError;
        } else {
            submission.status = 'success';
            submission.output = result.stdout;
        }

        await submission.save();
        
        const finalStatus = result.compileError || result.runtimeError ? 'failed' : 'success';
        const finalLogs = result.compileError ? 'Compilation failed!' : (result.runtimeError ? 'Runtime error occurred.' : 'Execution finished successfully.');
        const finalData = { 
            output: result.compileError || result.runtimeError || result.stdout,
            executionTime: result.executionTime 
        };

        emitProgress(submissionId, finalStatus, finalLogs, finalData);
        emitProgress(`user_${userId}`, finalStatus, finalLogs, finalData);

        console.log(`Finished submission: ${submissionId}`);
        
    } catch (error) {
        console.error(`Worker error for ${submissionId}:`, error);
        await Submission.findByIdAndUpdate(submissionId, {
            status: 'failed',
            output: `System Error: ${error.message}`
        });
        emitProgress(submissionId, 'failed', `Worker failure: ${error.message}`);
    }
}, { connection });

worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} has failed with ${err.message}`);
});

console.log('Submission Worker is active and waiting for jobs...');

module.exports = worker;
