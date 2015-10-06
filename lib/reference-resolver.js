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


  ReferenceResolver.prototype._walkReference = function(file, resolved) {
    var dir = pathutil.dirname(file);
    var source = TypeScript.ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), this._compilationSettings.target, true);
    var ret = {resolved: [], diagnostics: source.parseDiagnostics.concat(source.bindDiagnostics)};
    var pushed = false;
    resolved[file] = true;

    source.statements.forEach(function(node) {
      var filename;
      if (node.moduleSpecifier) {
        if (!pushed) {
          pushed = true;
          ret.resolved.push({path: file});
        }
        filename = pathutil.join(dir, node.moduleSpecifier.text) + '.ts';
      } else if (node.externalModuleName || (node.moduleReference && node.moduleReference.expression)) {
        if (node.moduleReference && !pushed) {
          pushed = true;
          ret.resolved.push({path: file});
        }
        filename = pathutil.join(dir, (node.externalModuleName || node.moduleReference.expression).text) + '.ts';
      }
      if (filename && !resolved[filename]) {
        ret.resolved.push({path: filename});
        var child = this._walkReference(filename, resolved);
        ret.resolved = ret.resolved.concat(child.resolved);
        ret.diagnostics = ret.diagnostics.concat(child.diagnostics);
      }
    }, this);

    source.referencedFiles.map(function(node) {
      var filename = pathutil.join(dir, node.filename || node.fileName);
      if (!resolved[filename]) {
        ret.resolved.push({path: filename});
        var child = this._walkReference(filename, resolved);
        ret.resolved = ret.resolved.concat(child.resolved);
        ret.diagnostics = ret.diagnostics.concat(child.diagnostics);
      }
    }, this);
    
    return ret;
  };


  ReferenceResolver.prototype.resolve = function(file) {
    var resolved = {};
    return this._walkReference(file, resolved);
  };
}


module.exports = ReferenceResolver;

