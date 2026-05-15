const BaseExecutor = require('./baseExecutor');
const languages = require('../config/languages.json');

class JavaExecutor extends BaseExecutor {
    constructor() {
        super(languages.java);
    }
}

module.exports = new JavaExecutor();
