const IORedis = require('ioredis');

const connection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null, // Required for BullMQ
});

connection.on('error', (err) => {
    console.error('Redis Connection Error:', err);
});

connection.on('connect', () => {
    console.log('Redis Connected Successfully');
});

module.exports = connection;
