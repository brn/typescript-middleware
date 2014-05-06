/**
 * @fileoverview
 * @author Taketoshi Aono
 */

'use strict';

var fs = require('fs');
var TypeScript = require('./typescript.inject');
var referenceResolver = require('./reference-resolver');
var pathutil = require('./pathutil');
var util = require('util');
var HostBase = require('./host-base');


/**
 * @constructor
 * @extends {HostBase}
 * @param {TypeScript.CompilationSettings} compilationSettings
 */
function Compiler(compilationSettings) {
  HostBase.call(this);
  
  /**
   * @private {TypeScript.TypeScriptCompiler}
   */
  this._compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), compilationSettings);
}
util.inherits(Compiler, HostBase);


/**
 * @param {TypeScript.ReferenceResolutionResults} resolvedFiles
 * @returns {{
 *   compiled: Array,
 *   diagnostics: Array.<string>
 * }} 
 */
Compiler.prototype.compile = function(resolvedFiles) {
  resolvedFiles.forEach(function (resolvedFile) {
    var sourceFile = this.getSourceFile(resolvedFile.path);
    this._compiler.addFile(resolvedFile.path, sourceFile.scriptSnapshot, sourceFile.byteOrderMark, 0, false, resolvedFile.referencedFiles);
  }.bind(this));
  
  var results = [];
  for (var it = this._compiler.compile(function (path) {
    return pathutil.resolve(path);
  }.bind(this)); it.moveNext();) {
    var result = it.current();

    result.diagnostics.forEach(function (d) {
      return this.addDiagnostic(d);
    }.bind(this));
    results.push(result.outputFiles);
  }
  
  return {
    compiled: results,
    diagnostics: this.getDiagnostics()
  };
};


module.exports = Compiler;
