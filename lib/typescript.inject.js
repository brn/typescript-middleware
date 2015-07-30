/**
 * @fileoverview
 * @author Taketoshi Aono
 */

var vm = require('vm');
var fs = require('fs');
var pathutil = require('./pathutil');

try {
  module.exports.ts = require('typescript');
} catch(e) {
  var __typescriptCode__;
  (function() {
    try {
      var ts = require.resolve('typescript');
      var dir = pathutil.dirname(ts);
      try {
        __typescriptCode__ = fs.readFileSync(dir + '/typescriptServices.js', 'utf8');
      } catch(e) {
        __typescriptCode__ = fs.readFileSync(ts, 'utf8');
      }
    } catch(e) {
      throw new Error('typescript is not installed yet.\nrun \'npm install typescript -g\'');
    }
  })();

  eval(__typescriptCode__);

  if (typeof ts === 'object') {
    TypeScript.ts = ts;
  }
  module.exports = TypeScript;
}
