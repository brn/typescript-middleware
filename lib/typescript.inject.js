/**
 * @fileoverview
 * @author Taketoshi Aono
 */

var vm = require('vm');
var fs = require('fs');

eval(fs.readFileSync(require.resolve('typescript'), 'utf-8'));
module.exports = TypeScript;
