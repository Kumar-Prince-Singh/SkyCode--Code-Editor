const BaseExecutor = require('./baseExecutor');
const languages = require('../config/languages.json');

class CppExecutor extends BaseExecutor {
    constructor() {
        super(languages.cpp);
    }
}

module.exports = new CppExecutor();
