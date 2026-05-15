const BaseExecutor = require('./baseExecutor');
const languages = require('../config/languages.json');

class JsExecutor extends BaseExecutor {
    constructor() {
        super(languages.javascript);
    }
}

module.exports = new JsExecutor();
