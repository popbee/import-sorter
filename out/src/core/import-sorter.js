"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const path = require("path");
const NEW_PERIOD_CHAR = String.fromCharCode(128);
class InMemoryImportSorter {
    initialise(sortConfig) {
        this.sortConfig = sortConfig;
    }
    sortImportElements(imports) {
        this.assertIsInitialised();
        const clonedElements = lodash_1.cloneDeep(imports);
        const joinedImportsResult = this.joinImportPaths(clonedElements);
        const duplicates = joinedImportsResult.duplicates;
        const sortedImportsExpr = this.sortNamedBindings(joinedImportsResult.joinedExpr);
        const sortedElementGroups = this.applyCustomSortingRules(sortedImportsExpr);
        this.sortModuleSpecifiers(sortedElementGroups);
        return {
            groups: sortedElementGroups,
            duplicates: duplicates
        };
    }
    assertIsInitialised() {
        if (!this.sortConfig) {
            throw new Error('SortConfiguration: has not been initialised');
        }
    }
    normalizePaths(imports) {
        return lodash_1.chain(imports).map(x => {
            const isRelativePath = x.moduleSpecifierName.startsWith(`.`)
                || x.moduleSpecifierName.startsWith(`..`);
            x.moduleSpecifierName = isRelativePath ? path.normalize(x.moduleSpecifierName).replace(new RegExp('\\' + path.sep, 'g'), '/') : x.moduleSpecifierName;
            if (isRelativePath && !x.moduleSpecifierName.startsWith(`./`) && !x.moduleSpecifierName.startsWith(`../`)) {
                if (x.moduleSpecifierName === '.') {
                    x.moduleSpecifierName = './';
                }
                else if (x.moduleSpecifierName === '..') {
                    x.moduleSpecifierName = '../';
                }
                else {
                    x.moduleSpecifierName = `./${x.moduleSpecifierName}`;
                }
            }
            return x;
        });
    }
    sortNamedBindings(importsExpr) {
        const sortOrder = this.getSortOrderFunc(this.sortConfig.importMembers.order);
        return importsExpr.map(x => {
            if (x.namedBindings && x.namedBindings.length) {
                x.namedBindings =
                    lodash_1.chain(x.namedBindings)
                        .orderBy((y) => sortOrder(y.name), [this.sortConfig.importMembers.direction])
                        .value();
                return x;
            }
            return x;
        });
    }
    sortModuleSpecifiers(elementGroups) {
        const sortOrder = this.getSortOrderFunc(this.sortConfig.importPaths.order, true);
        elementGroups.filter(gr => !gr.customOrderRule.disableSort).forEach(gr => {
            gr.elements = lodash_1.chain(gr.elements)
                .orderBy(y => sortOrder(y.moduleSpecifierName), [this.sortConfig.importPaths.direction])
                .value();
        });
    }
    joinImportPaths(imports) {
        const normalizedPathsExpr = this.normalizePaths(imports);
        if (!this.sortConfig.joinImportPaths) {
            return {
                joinedExpr: normalizedPathsExpr,
                duplicates: []
            };
        }
        const duplicates = [];
        const joined = normalizedPathsExpr
            .groupBy(x => x.moduleSpecifierName)
            .map((x) => {
            if (x.length > 1) {
                //removing duplicates by module specifiers
                const nameBindings = lodash_1.chain(x).flatMap(y => y.namedBindings).uniqBy(y => y.name).value();
                const defaultImportElement = x.find(y => !lodash_1.isNil(y.defaultImportName) && !(y.defaultImportName.trim() === ''));
                const defaultImportName = defaultImportElement ? defaultImportElement.defaultImportName : null;
                x[0].defaultImportName = defaultImportName;
                x[0].namedBindings = nameBindings;
                duplicates.push(...x.slice(1));
                return x[0];
            }
            else {
                //removing duplicate name bindings
                const nameBindings = lodash_1.chain(x).flatMap(y => y.namedBindings).uniqBy(y => y.name).value();
                x[0].namedBindings = nameBindings;
            }
            return x[0];
        })
            .value();
        return {
            joinedExpr: lodash_1.chain(joined),
            duplicates: duplicates
        };
    }
    getDefaultLineNumber() {
        if (this.sortConfig.customOrderingRules
            && this.sortConfig.customOrderingRules.defaultNumberOfEmptyLinesAfterGroup) {
            return this.sortConfig.customOrderingRules.defaultNumberOfEmptyLinesAfterGroup;
        }
        return 0;
    }
    applyCustomSortingRules(sortedImports) {
        if (!this.sortConfig.customOrderingRules
            || !this.sortConfig.customOrderingRules.rules
            || this.sortConfig.customOrderingRules.rules.length === 0) {
            const customRules = this.sortConfig.customOrderingRules;
            return [{
                    elements: sortedImports.value(),
                    numberOfEmptyLinesAfterGroup: this.getDefaultLineNumber(),
                    customOrderRule: {
                        disableSort: customRules ? customRules.disableDefaultOrderSort : false,
                        numberOfEmptyLinesAfterGroup: customRules ? customRules.defaultNumberOfEmptyLinesAfterGroup : null,
                        orderLevel: customRules ? customRules.defaultOrderLevel : null,
                        regex: null
                    }
                }];
        }
        const rules = this.sortConfig
            .customOrderingRules
            .rules
            .map(x => ({
            orderLevel: x.orderLevel,
            regex: x.regex,
            type: x.type,
            disableSort: x.disableSort,
            numberOfEmptyLinesAfterGroup: lodash_1.isNil(x.numberOfEmptyLinesAfterGroup) ? this.getDefaultLineNumber() : x.numberOfEmptyLinesAfterGroup
        }));
        const result = {};
        sortedImports
            .forEach(x => {
            const rule = rules.find(e => !e.type || e.type === 'path' ? x.moduleSpecifierName.match(e.regex) !== null : this.matchNameBindings(x, e.regex));
            if (!rule) {
                this.addElement(result, {
                    disableSort: this.sortConfig.customOrderingRules.disableDefaultOrderSort,
                    numberOfEmptyLinesAfterGroup: this.getDefaultLineNumber(),
                    orderLevel: this.sortConfig.customOrderingRules.defaultOrderLevel,
                    regex: null
                }, x);
                return;
            }
            this.addElement(result, rule, x);
        })
            .value();
        const customSortedImports = lodash_1.chain(Object.keys(result))
            .orderBy(x => +x)
            .map(x => result[x])
            .value();
        return customSortedImports;
    }
    matchNameBindings(importElement, regex) {
        //match an empty string here
        if (!importElement.hasFromKeyWord) {
            return ''.match(regex) !== null;
        }
        if (importElement.defaultImportName && importElement.defaultImportName.trim() !== '') {
            return importElement.defaultImportName.match(regex) !== null;
        }
        return importElement.namedBindings.some(x => x.name.match(regex) !== null);
    }
    addElement(dictionary, rule, value) {
        if (lodash_1.isNil(dictionary[rule.orderLevel])) {
            dictionary[rule.orderLevel] = { elements: [], numberOfEmptyLinesAfterGroup: rule.numberOfEmptyLinesAfterGroup, customOrderRule: rule };
            dictionary[rule.orderLevel].elements = [value];
        }
        else {
            dictionary[rule.orderLevel].elements.push(value);
        }
    }
    getSortOrderFunc(sortOrder, changePeriodOrder = false) {
        if (sortOrder === 'caseInsensitive') {
            return (x) => changePeriodOrder ? this.parseStringWithPeriod(x.toLowerCase()) : x.toLowerCase();
        }
        if (sortOrder === 'lowercaseLast') {
            return (x) => changePeriodOrder ? this.parseStringWithPeriod(x) : x;
        }
        if (sortOrder === 'unsorted') {
            return (_x) => '';
        }
        if (sortOrder === 'lowercaseFirst') {
            return (x) => changePeriodOrder ? this.parseStringWithPeriod(this.swapStringCase(x)) : this.swapStringCase(x);
        }
    }
    parseStringWithPeriod(value) {
        return value && value.startsWith('.') ? value.replace('.', NEW_PERIOD_CHAR) : value;
    }
    swapStringCase(str) {
        if (str == null) {
            return '';
        }
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            const u = c.toUpperCase();
            result += u === c ? c.toLowerCase() : u;
        }
        return result;
    }
}
exports.InMemoryImportSorter = InMemoryImportSorter;
//# sourceMappingURL=import-sorter.js.map