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
var _ = require('lodash');
var mkdirp = require('mkdirp');



if (TypeScript.TypeScriptCompiler) {

  /**
   * @constructor
   * @extends {HostBase}
   * @param {TypeScript.CompilationSettings} compilationSettings
   */
  var Compiler = function (compilationSettings) {
    HostBase.call(this);
    
    /**
     * @private {TypeScript.TypeScriptCompiler}
     */
    this._compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), compilationSettings);
  };
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


  Compiler.prototype.processDiagnostics = function(diagnostics) {
    return _.map(diagnostics, function(v, k) {
      return v.toString();
    }).join('\n');
  };


  Compiler.prototype.processCompilationResult = function(compiled, cb, js) {
    compiled.forEach(function(ret) {
      ret.forEach(function(ret) {
        try {
          mkdirp.sync(pathutil.dirname(ret.name));
          fs.writeFileSync(ret.name, ret.text, 'utf8');
        } catch(e) {
          return cb(false, js, e);
        }
      });
    });
  };
} else {
  Compiler = function(compilationSettings) {
    HostBase.call(this);
    this._compilationSettings = compilationSettings;
  };
  util.inherits(Compiler, HostBase);

  
  Compiler.prototype.compile = function(resolvedFiles, target) {
    var program = TypeScript.ts.createProgram([target], this._compilationSettings, this);
    var errors = program.getDiagnostics();
    var checker = program.getTypeChecker(true);
    var emitFiles = checker.emitFiles();
    
    return {
      compiled: program.getSourceFiles().map(function(f) {
        return f.filename;
      }).filter(function(f) {
        return /d.ts$/.test(f);
      }),
      diagnostics: errors.concat(checker.getDiagnostics()).concat(emitFiles.errors)
    };
  };


  Compiler.prototype.processDiagnostics = function(diagnostics) {
    return  _.map(diagnostics, function(v, k) {
      var output = "";
      if (v.file) {
        var loc = v.file.getLineAndCharacterFromPosition(v.start);
        output += v.file.filename + "(" + loc.line + "," + loc.character + "): ";
      }
      var category = TypeScript.ts.DiagnosticCategory[v.category].toLowerCase();
      output += category + " TS" + v.code + ": " + v.messageText + this.getNewLine();
      return output;
    }, this);
  };


  Compiler.prototype.useCaseSensitiveFileNames = function() {
    return this._compilationSettings.useCaseSensitiveFileNames;
  };


  Compiler.prototype.processCompilationResult = function(compiled, cb, js) {};
}


module.exports = Compiler;
