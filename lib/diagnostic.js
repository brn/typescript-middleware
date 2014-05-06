/**
 * @fileoverview
 * @author Taketoshi Aono
 */

'use strict';

var TypeScript = require('./typescript.inject');


function Diagnostic() {
  /**
   * @private {Array.<string>}
   */
  this._diagnostics = [];
}


/**
 * @param {TypeScript.Diagnostic} diagnostic
 */
Diagnostic.prototype.addDiagnostic = function(diagnostic) {
  this._diagnostics.push(TypeScript.TypeScriptCompiler.getFullDiagnosticText(diagnostic));
};


/**
 * @returns {Array.<string>} 
 */
Diagnostic.prototype.getDiagnostics = function() {
  return this._diagnostics;
};


module.exports =  Diagnostic;
