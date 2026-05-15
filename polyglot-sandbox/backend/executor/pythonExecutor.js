const BaseExecutor = require('./baseExecutor');
const languages = require('../config/languages.json');

class PythonExecutor extends BaseExecutor {
    constructor() {
        super(languages.python);
    }
}

module.exports = new PythonExecutor();
