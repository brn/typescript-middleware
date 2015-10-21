/**
 * @fileoverview
 * @author Taketoshi Aono
 */

var util = require('util');
var TypeScript = require('./typescript.inject');
var Diagnostic = require('./diagnostic');
var pathutil = require('./pathutil');
var fs = require('fs');


function OptionParser() {
  Diagnostic.call(this);
  
  /**
   * @private {TypeScript.CompilationSettings}
   */
  this._compilationSettings = null;
}
util.inherits(OptionParser, Diagnostic);


OptionParser.prototype.parse = function(options) {
  var _this = this;

  var mutableSettings = TypeScript.CompilationSettings? new TypeScript.CompilationSettings(): {};
  var outDirName = TypeScript.CompilationSettings? 'outDirOption': 'outDir';
  if (options.outDir) {
    mutableSettings[outDirName] = options.outDir;
  }

  var sourceMapOptionName = TypeScript.CompilationSettings? 'mapSourceFiles': 'sourceMap';
  if (options.sourceMap) {
    mutableSettings[sourceMapOptionName] = true;
  }

  if (options.mapRoot) {
    mutableSettings.mapRoot = options.mapRoot;
  }

  if (options.sourceRoot) {
    mutableSettings.sourceRoot = options.sourceRoot;
  }

  if (options.inlineSourceMap) {
    mutableSettings.inlineSourceMap = true;
  }

  if (options.inlineSources) {
    mutableSettings.inlineSources = true;
  }

  if (options.rootDir) {
    mutableSettings.rootDir = options.rootDir;
  }

  if (options.removeComments) {
    mutableSettings.removeComments = options.removeComments;
  }

  if (options.experimentalDecorators) {
    mutableSettings.experimentalDecorators = options.experimentalDecorators;
  }

  var targetOptionName = TypeScript.CompilationSettings? 'codeGenTarget': 'target';
  if (options.target) {
    if (options.target === 'es3') {
      mutableSettings[targetOptionName] = 0 /* EcmaScript3 */;
    } else if (options.target === 'es5') {
      mutableSettings[targetOptionName] = 1 /* EcmaScript5 */;
    } else {
      mutableSettings[targetOptionName] = 0;
    }
  }

  var moduleOptionName = TypeScript.CompilationSettings? 'moduleGenTarget': 'module';
  if (options.module === 'commonjs') {
    mutableSettings[moduleOptionName] = 1 /* Synchronous */;
  } else if (options.module === 'amd') {
    mutableSettings[moduleOptionName] = 2 /* Asynchronous */;
  } else if (options.module === 'umd') {
    mutableSettings[moduleOptionName] = 3 /* Synchronous */;
  } else if (options.module === 'system') {
    mutableSettings[moduleOptionName] = 4 /* Asynchronous */;
  } else if (options.module === 'ES6' || options.module === 'ES2015') {
    mutableSettings[moduleOptionName] = 5 /* Asynchronous */;
  } else {
    mutableSettings[moduleOptionName] = 1;
  }

  var caseSensitiveOptionName = TypeScript.CompilationSettings? 'useCaseSensitiveFileResolution': 'useCaseSensitiveFileNames';
  if (options.useCaseSensitiveFileResolution) {
    mutableSettings[caseSensitiveOptionName] = true;
  }

  var locale = null;
  if (options.locale) {
    locale = options.locale;
  }

  if (options.noImplicitAny) {
    mutableSettings.noImplicitAny = true;
  }

  this._compilationSettings = TypeScript.ImmutableCompilationSettings? TypeScript.ImmutableCompilationSettings.fromCompilationSettings(mutableSettings): mutableSettings;
  
  if (locale) {
    if (!this._setLocale(locale)) {
      return false;
    }
  }
};


OptionParser.prototype._setLocale = function(locale) {
  var matchResult = /^([a-z]+)([_\-]([a-z]+))?$/.exec(locale.toLowerCase());
  if (!matchResult) {
    this.addDiagnostic(new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, ['en', 'ja-jp']));
    return false;
  }

  var language = matchResult[1];
  var territory = matchResult[3];

  if (!this._setLanguageAndTerritory(language, territory) && !this._setLanguageAndTerritory(language, null)) {
    this.addDiagnostic(new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Unsupported_locale_0, [locale]));
    return false;
  }

  return true;
};


OptionParser.prototype._setLanguageAndTerritory = function (language, territory) {
  var compilerFilePath = process.mainModule.filename;
  var containingDirectoryPath = pathutil.dirname(compilerFilePath);

  var filePath = pathutil.join(containingDirectoryPath, language);
  if (territory) {
    filePath = filePath + "-" + territory;
  }

  filePath = pathutil.resolve(pathutil.join(filePath, "diagnosticMessages.generated.json"));

  if (!fs.existsSync(filePath)) {
    return false;
  }

  var fileContents = fs.readFileSync(filePath, 'utf-8');
  TypeScript.LocalizedDiagnosticMessages = JSON.parse(fileContents.contents);
  return true;
};


/**
 * @returns {TypeScript.CompilationSettings} 
 */
OptionParser.prototype.getCompilationSettings = function() {
  return this._compilationSettings;
};


/**
 * @returns {boolean} 
 */
OptionParser.prototype.hasErrors = function() {
  return this.getDiagnostics().length > 0;
};


module.exports = OptionParser;
