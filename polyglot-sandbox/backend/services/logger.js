const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logMessage = (level, message, metadata = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
        timestamp,
        level,
        message,
        ...metadata
    });

    const fileName = `${level.toLowerCase()}.log`;
    const filePath = path.join(logDir, fileName);

    fs.appendFileSync(filePath, logEntry + '\n');
    console.log(`[${level}] ${message}`);
};

const logger = {
    info: (msg, meta) => logMessage('INFO', msg, meta),
    error: (msg, meta) => logMessage('ERROR', msg, meta),
    security: (msg, meta) => logMessage('SECURITY', msg, meta)
};

module.exports = logger;
