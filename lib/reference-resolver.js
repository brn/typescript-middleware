/**
 * @fileoverview
 * @author Taketoshi Aono
 */

'use strict';

var fs = require('fs');
var util = require('util');
var pathutil = require('./pathutil');
var TypeScript = require('./typescript.inject');
var HostBase = require('./host-base');


var ReferenceResolver;

if (TypeScript.ReferenceResolver) {
  /**
   * @constructor
   * @extends {HostBase}
   */
  var ReferenceResolverHost = function () {
    HostBase.call(this);
  };
  util.inherits(ReferenceResolverHost, HostBase);


  /**
   * @param {string} filename
   * @returns {TypeScript.ScriptSnapshot} 
   */
  ReferenceResolverHost.prototype.getScriptSnapshot = function(filename) {
    return this.getSourceFile(filename).scriptSnapshot;
  };



  ReferenceResolverHost.prototype.resolveRelativePath = function(path, directory) {
    var unQuotedPath = TypeScript.stripStartAndEndQuotes(path);
    unQuotedPath = unQuotedPath.replace(/\.ts$/, '');
    var normalizedPath;

    if (TypeScript.isRooted(unQuotedPath) || !directory) {
      normalizedPath = unQuotedPath;
    } else {
      normalizedPath = pathutil.join(directory, unQuotedPath);
    }
    
    return pathutil.resolve(normalizedPath);
  };


  /**
   * @param {string} path
   * @returns {boolean} 
   */
  ReferenceResolverHost.prototype.fileExists = function(path) {
    return fs.existsSync(path);
  };


  /**
   * @param {string} path
   * @returns {boolean} 
   */
  ReferenceResolverHost.prototype.directoryExists = function(path) {
    return fs.exists(path);
  };


  /**
   * @param {string} path
   * @returns {string} 
   */
  ReferenceResolverHost.prototype.getParentDirectory = function(path) {
    return pathutil.dirname(path);
  };


  /**
   * @constructor
   */
  ReferenceResolver = function () {
    /**
     * @private {ReferenceResolverHost}
     */
    this._referenceResolverHost = new ReferenceResolverHost();
  };


  /**
   * @param {string} file
   * @returns {{
   *   resolved: TypeScript.ReferenceResolutionResults,
   *   diagnostics: Array.<string>
   * }} 
   */
  ReferenceResolver.prototype.resolve = function(file) {
    var resolutionResults = TypeScript.ReferenceResolver.resolve([file], this._referenceResolverHost, true);
    var resolvedFiles = resolutionResults.resolvedFiles;

    resolutionResults.diagnostics.forEach(function (diagnostic) {
      this._referenceResolverHost.addDiagnostic(diagnostic);
    }, this);

    var libraryResolvedFile = {
      path: this._getDefaultLibraryFilePath(),
      referencedFiles: [],
      importedFiles: []
    };

    resolvedFiles = [libraryResolvedFile].concat(resolvedFiles);
    
    return {
      resolved: resolvedFiles,
      diagnostics: this._referenceResolverHost.getDiagnostics()
    };
  };


  ReferenceResolver.prototype._getDefaultLibraryFilePath = function() {
    var compilerFilePath = this._referenceResolverHost.getExecutingFilePath();
    var containingDirectoryPath = pathutil.dirname(compilerFilePath);
    var libraryFilePath = pathutil.resolve(containingDirectoryPath + "/lib.d.ts");

    return libraryFilePath;
  };
} else {
  ReferenceResolver = function(compilationSettings) {
    this._compilationSettings = compilationSettings;
  };


  ReferenceResolver.prototype.resolve = function(file) {
    var reference = [];
    var dir = pathutil.dirname(file);
    var source = TypeScript.ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), this._compilationSettings.target, true);
    source.statements.forEach(function(node) {
      if (node.externalModuleName) {
        reference.push({path: pathutil.join(dir, node.externalModuleName.text) + '.ts'});
      }
    });
    reference = reference.concat(source.referencedFiles.map(function(node) {
      return {path: pathutil.join(dir, node.filename)};
    }));
    var diagnostics = source.syntacticErrors.concat(source.semanticErrors);
    
    return {
      resolved: reference,
      diagnostics: diagnostics
    };
  };
}


module.exports = ReferenceResolver;

