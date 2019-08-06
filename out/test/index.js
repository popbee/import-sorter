"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testRunner = require("vscode/lib/testrunner");
testRunner.configure({
    ui: 'tdd',
    useColors: true // colored output from test results
});
module.exports = testRunner;
//# sourceMappingURL=index.js.map