/**
 * @fileoverview
 * @author Taketoshi Aono
 */


'use strict';

var fs = require('fs');
var util = require('util');
var TypeScript = require('./typescript.inject');
var Diagnostic = require('./diagnostic');
var pathutil = require('./pathutil');


/**
 * @constructor
 * @param {TypeScript.ScriptSnapshot} scriptSnapshot
 * @param {byteOrderMark} boolean
 */
function SourceFile(scriptSnapshot, byteOrderMark) {
  /**
   * @type {TypeScript.ScriptSnapshot}
   */
  this.scriptSnapshot = scriptSnapshot;

  /**
   * @type {boolean}
   */
  this.byteOrderMark = byteOrderMark;
}


/**
 * @constructor
 * @extends {Diagnostic}
 */
function HostBase() {
  Diagnostic.call(this);
  /**
   * @private {TypeScript.StringHashTable}
   */
  this._fileNameToSourceFile = new TypeScript.StringHashTable();
}
util.inherits(HostBase, Diagnostic);


HostBase.prototype.getSourceFile = function(filename) {
  var sourceFile = this._fileNameToSourceFile.lookup(filename);
  if (!sourceFile) {
    var fileInformation;

    try  {
      fileInformation = fs.readFileSync(filename, 'utf8');
    } catch (e) {
      this.addDiagnostic(new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file_0_1, [filename, e.message]));
      fileInformation = '';
    }

    var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation);
    sourceFile = new SourceFile(snapshot, '');
    this._fileNameToSourceFile.add(filename, sourceFile);
  }

  return sourceFile;
};


HostBase.prototype.getExecutingFilePath = function() {
  return pathutil.dirname(require.resolve('typescript')) + '/bin';
};


module.exports = HostBase;
