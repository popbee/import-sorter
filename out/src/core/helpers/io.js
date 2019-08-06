"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const rxjs_1 = require("rxjs");
function readFile$(filePath, encoding = 'utf-8') {
    return rxjs_1.Observable.create((observer) => {
        fs.readFile(filePath, encoding, (error, data) => {
            if (error) {
                observer.error(error);
            }
            else {
                observer.next(data);
                observer.complete();
            }
        });
    });
}
exports.readFile$ = readFile$;
function writeFile$(filePath, data) {
    return rxjs_1.Observable.create((observer) => {
        fs.writeFile(filePath, data, (error) => {
            if (error) {
                observer.error(error);
            }
            else {
                observer.next(void 0);
                observer.complete();
            }
        });
    });
}
exports.writeFile$ = writeFile$;
function getFullPath(srcPath, filename) {
    return path.join(srcPath, filename);
}
exports.getFullPath = getFullPath;
function filePaths$(startingSourcePath, pattern, ignore) {
    return rxjs_1.Observable.create((observer) => {
        glob(pattern, {
            cwd: startingSourcePath,
            ignore,
            nodir: true
        }, (error, matches) => {
            if (error) {
                observer.error(error);
            }
            else {
                const fullPaths = matches.map(filePath => getFullPath(startingSourcePath, filePath));
                observer.next(fullPaths);
                observer.complete();
            }
        });
    });
}
exports.filePaths$ = filePaths$;
//# sourceMappingURL=io.js.map