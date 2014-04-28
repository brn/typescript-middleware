/**
 * @fileoverview
 * @author Taketshi Aono
 */

'use strict';
var pathutil = require('./pathutil');
var vm = require('vm');
var fs = require('fs');


// eval source code.
vm.runInThisContext(fs.readFileSync(require.resolve('typescript'), 'utf-8'));

/**
 * @constructor
 */
function SourceFile(scriptSnapshot, byteOrderMark) {
  this.scriptSnapshot = scriptSnapshot;
  this.byteOrderMark = byteOrderMark;
}


/**
 * @constructor
 */
function ReferenceResolverHost() {
  this.fileNameToSourceFile = new TypeScript.StringHashTable();
}


ReferenceResolverHost.prototype.writeFile = function(path, contents, writeByteOrderMark) {};


ReferenceResolverHost.prototype.fileExists = function(path) {
  return fs.existsSync(path);
};


ReferenceResolverHost.prototype.directoryExists = function(path) {
  return fs.existsSync(path);
};


ReferenceResolverHost.prototype.resolveRelativePath = function(path, directory) {
  var start = new Date().getTime();

  var unQuotedPath = TypeScript.stripStartAndEndQuotes(path);
  var normalizedPath;

  if (TypeScript.isRooted(unQuotedPath) || !directory) {
    normalizedPath = unQuotedPath;
  } else {
    normalizedPath = directory + '/' + unQuotedPath;
  }

  normalizedPath = pathutil.resolve(normalizedPath);

  normalizedPath = TypeScript.switchToForwardSlashes(normalizedPath);

  return normalizedPath;
};


ReferenceResolverHost.prototype.getSourceFile = function(fileName) {
  var sourceFile = this.fileNameToSourceFile.lookup(fileName);
  if (!sourceFile) {
    var fileInformation;

    try  {
      fileInformation = fs.readFileSync(fileName, 'utf-8');
    } catch (e) {
      this.addDiagnostic(new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file_0_1, [fileName, e.message]));
      fileInformation = new TypeScript.FileInformation("", 0 /* None */);
    }

    var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation);
    var sourceFile = new SourceFile(snapshot, '');
    this.fileNameToSourceFile.add(fileName, sourceFile);
  }

  return sourceFile;
};


ReferenceResolverHost.prototype.getScriptSnapshot = function (fileName) {
  return this.getSourceFile(fileName).scriptSnapshot;
};


ReferenceResolverHost.prototype.getParentDirectory = function (path) {
  var start = new Date().getTime();
  var result = pathutil.dirname(path);
  TypeScript.compilerDirectoryNameTime += new Date().getTime() - start;

  return result;
};


function addDiagnostic (diagnostic, arr) {
  var diagnosticInfo = diagnostic.info();

  if (diagnostic.fileName()) {
    arr.push(diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + "): ");
  }

  arr.push(diagnostic.message());
};


function resolveReference(tsFile) {
  var diagnostics = [];
  var resolved = [];
  try {
    resolved = TypeScript.ReferenceResolver.resolve([tsFile], new ReferenceResolverHost, true);
    resolved.diagnostics.forEach(function (d) {
      addDiagnostic(d, diagnostics);
    });
    if (resolved.diagnostics.length) {
      return {success: false, diagnostic: diagnostics.join('\n')};
    }
    return {success: true, result: resolved};
  } catch (x) {
    return {success: false, diagnostic: x.stack};
  }
};


/**
 * resolve typescript dependencies.
 * @param {string} path
 * @returns {Array.<string>}
 * @throws {Error}
 */
export.resolve = function(path) {
  path = pathutil.resolve(path);
  var resolve = resolveReference(path);
  if (!resolve.success) {
    throw new Error(resolve.diagnostic);
  }

  return resolve.result.resolvedFiles.map(function(m) {return pathutil.replace(m.path);});
};

