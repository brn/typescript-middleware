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


if (TypeScript.TypeScriptCompiler) {
  /**
   * @param {TypeScript.Diagnostic} diagnostic
   */
  Diagnostic.prototype.addDiagnostic = function(diagnostic) {
    this._diagnostics.push(TypeScript.TypeScriptCompiler.getFullDiagnosticText(diagnostic));
  };
} else {
  /**
   * @param {TypeScript.Diagnostic} diagnostic
   */
  Diagnostic.prototype.addDiagnostic = function(diagnostic) {
    this._diagnostics.push(diagnostic);
  };
}

/**
 * @returns {Array.<string>} 
 */
Diagnostic.prototype.getDiagnostics = function() {
  return this._diagnostics;
};


module.exports =  Diagnostic;
