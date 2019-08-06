"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const import_sorter_extension_1 = require("./import-sorter-extension");
exports.activate = (context) => {
    const importSorterExtension = new import_sorter_extension_1.ImportSorterExtension();
    importSorterExtension.initialise();
    const sortImportsCommand = vscode_1.commands.registerCommand('extension.sortImports', () => {
        importSorterExtension.sortActiveDocumentImportsFromCommand();
    });
    const sortImportsInDirectoryCommand = vscode_1.commands.registerCommand('extension.sortImportsInDirectory', (uri) => {
        importSorterExtension.sortImportsInDirectories(uri);
    });
    const onWillSaveTextDocument = vscode_1.workspace.onWillSaveTextDocument(event => importSorterExtension.sortModifiedDocumentImportsFromOnBeforeSaveCommand(event));
    context.subscriptions.push(sortImportsCommand);
    context.subscriptions.push(sortImportsInDirectoryCommand);
    context.subscriptions.push(importSorterExtension);
    context.subscriptions.push(onWillSaveTextDocument);
};
// this method is called when your extension is deactivated
exports.deactivate = () => { };
//# sourceMappingURL=extension.js.map