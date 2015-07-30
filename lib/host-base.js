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
var mkdirp = require('mkdirp');


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


function StringHashTable() {
  this._hash = {};
}


StringHashTable.prototype.lookup = function(name) {
  return TypeScript.ts.lookUp(this._hash, name);
};


StringHashTable.prototype.add = function(name, file) {
  this._hash[name] = file;
};



/**
 * @constructor
 * @extends {Diagnostic}
 */
function HostBase() {
  Diagnostic.call(this);
  /**
   * @private {TypeScript.StringHashTable}
   */
  this._fileNameToSourceFile = new (TypeScript.StringHashTable || StringHashTable)();
  this._existingDirectories = {};
}
util.inherits(HostBase, Diagnostic);


if (TypeScript.ts) {
  HostBase.prototype.getSourceFile = function(filename, languageVersion, onError) {
    try {
      var text = fs.readFileSync(filename, 'utf8');
    } catch (e) {
      if (onError) {
        onError(e.message);
      }
      text = "";
    }
    return text !== undefined ? TypeScript.ts.createSourceFile(filename, text, languageVersion, "0") : undefined;
  };


  HostBase.prototype._directoryExists = function(path) {
    return fs.existsSync(path) && fs.statSync(path).isDirectory();
  };

  
  HostBase.prototype._directoryExists = function(directoryPath) {
    if (TypeScript.ts.hasProperty(this._existingDirectories, directoryPath)) {
      return true;
    }
    if (this._directoryExists(directoryPath)) {
      this._existingDirectories[directoryPath] = true;
      return true;
    }
    return false;
  };

  
  HostBase.prototype._ensureDirectoriesExist = function(directoryPath) {
    if (directoryPath.length > TypeScript.ts.getRootLength(directoryPath) && !this._directoryExists(directoryPath)) {
      var parentDirectory = TypeScript.ts.getDirectoryPath(directoryPath);
      this._ensureDirectoriesExist(parentDirectory);
      fs.mkdirSync(directoryPath);
    }
  };
  

  HostBase.prototype.writeFile = function(fileName, data, writeByteOrderMark, onError) {
    try {
      mkdirp(pathutil.dirname(fileName));
      fs.writeFileSync(fileName, data, 'utf8');
    } catch (e) {
      if (onError) {
        onError(e.message);
      }
    }    
  };


  HostBase.prototype.getCurrentDirectory = function() {
    return process.cwd();
  };
} else {
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
}


HostBase.prototype.getCanonicalFileName = function(filename) {
  return filename;
};


HostBase.prototype.getExecutingFilePath = function() {
  return pathutil.dirname(require.resolve('typescript')) + '/bin';
};


HostBase.prototype.getDefaultLibFileName = function() {
  return pathutil.join(pathutil.dirname(require.resolve('typescript')), 'lib.d.ts');
};


HostBase.prototype.getNewLine = function() {
  return '\n';
};


module.exports = HostBase;
