const cppExecutor = require('../executor/cppExecutor');
const pythonExecutor = require('../executor/pythonExecutor');
const javaExecutor = require('../executor/javaExecutor');
const jsExecutor = require('../executor/jsExecutor');

const executeCode = async (language, code, input) => {
    switch (language) {
        case 'cpp':
            return await cppExecutor.execute(code, input);
        case 'python':
            return await pythonExecutor.execute(code, input);
        case 'java':
            return await javaExecutor.execute(code, input);
        case 'javascript':
            return await jsExecutor.execute(code, input);
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
};

module.exports = {
    executeCode
};
