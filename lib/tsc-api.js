/**
 * @fileoverview
 * @author Taketoshi Aono
 */


'use strict';
var vm = require('vm');
var fs = require('fs');

vm.runInThisContext(fs.readFileSync(require.resolve('typescript'), 'utf-8'));

(function (TypeScript) {
  TypeScript.nodeMakeDirectoryTime = 0;
  TypeScript.nodeCreateBufferTime = 0;
  TypeScript.nodeWriteFileSyncTime = 0;

  (function (ByteOrderMark) {
    ByteOrderMark[ByteOrderMark["None"] = 0] = "None";
    ByteOrderMark[ByteOrderMark["Utf8"] = 1] = "Utf8";
    ByteOrderMark[ByteOrderMark["Utf16BigEndian"] = 2] = "Utf16BigEndian";
    ByteOrderMark[ByteOrderMark["Utf16LittleEndian"] = 3] = "Utf16LittleEndian";
  })(TypeScript.ByteOrderMark || (TypeScript.ByteOrderMark = {}));
  var ByteOrderMark = TypeScript.ByteOrderMark;

  var FileInformation = (function () {
    function FileInformation(contents, byteOrderMark) {
      this.contents = contents;
      this.byteOrderMark = byteOrderMark;
    }
    return FileInformation;
  })();
  TypeScript.FileInformation = FileInformation;

  TypeScript.Environment = (function () {

    function getNodeEnvironment() {
      var _fs = require('fs');
      var _path = require('path');
      var _module = require('module');
      var _os = require('os');

      return {
        newLine: _os.EOL,
        currentDirectory: function () {
          return process.cwd();
        },
        supportsCodePage: function () {
          return false;
        },
        readFile: function (file, codepage) {
          if (codepage !== null) {
            throw new Error(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.codepage_option_not_supported_on_current_platform, null));
          }

          var buffer = _fs.readFileSync(file);
          switch (buffer[0]) {
          case 0xFE:
            if (buffer[1] === 0xFF) {
              var i = 0;
              while ((i + 1) < buffer.length) {
                var temp = buffer[i];
                buffer[i] = buffer[i + 1];
                buffer[i + 1] = temp;
                i += 2;
              }
              return new FileInformation(buffer.toString("ucs2", 2), 2 /* Utf16BigEndian */);
            }
            break;
          case 0xFF:
            if (buffer[1] === 0xFE) {
              return new FileInformation(buffer.toString("ucs2", 2), 3 /* Utf16LittleEndian */);
            }
            break;
          case 0xEF:
            if (buffer[1] === 0xBB) {
              return new FileInformation(buffer.toString("utf8", 3), 1 /* Utf8 */);
            }
          }

          return new FileInformation(buffer.toString("utf8", 0), 0 /* None */);
        },
        writeFile: function (path, contents, writeByteOrderMark) {
          function mkdirRecursiveSync(path) {
            var stats = _fs.statSync(path);
            if (stats.isFile()) {
              throw "\"" + path + "\" exists but isn't a directory.";
            } else if (stats.isDirectory()) {
              return;
            } else {
              mkdirRecursiveSync(_path.dirname(path));
              _fs.mkdirSync(path, 509);
            }
          }
          var start = new Date().getTime();
          mkdirRecursiveSync(_path.dirname(path));
          TypeScript.nodeMakeDirectoryTime += new Date().getTime() - start;

          if (writeByteOrderMark) {
            contents = '\uFEFF' + contents;
          }

          var start = new Date().getTime();

          var chunkLength = 4 * 1024;
          var fileDescriptor = _fs.openSync(path, "w");
          try  {
            for (var index = 0; index < contents.length; index += chunkLength) {
              var bufferStart = new Date().getTime();
              var buffer = new Buffer(contents.substr(index, chunkLength), "utf8");
              TypeScript.nodeCreateBufferTime += new Date().getTime() - bufferStart;

              _fs.writeSync(fileDescriptor, buffer, 0, buffer.length, null);
            }
          } finally {
            _fs.closeSync(fileDescriptor);
          }

          TypeScript.nodeWriteFileSyncTime += new Date().getTime() - start;
        },
        fileExists: function (path) {
          return _fs.existsSync(path);
        },
        deleteFile: function (path) {
          try  {
            _fs.unlinkSync(path);
          } catch (e) {
          }
        },
        directoryExists: function (path) {
          return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
        },
        listFiles: function dir(path, spec, options) {
          options = options || {};

          function filesInFolder(folder) {
            var paths = [];

            var files = _fs.readdirSync(folder);
            for (var i = 0; i < files.length; i++) {
              var stat = _fs.statSync(folder + "\\" + files[i]);
              if (options.recursive && stat.isDirectory()) {
                paths = paths.concat(filesInFolder(folder + "\\" + files[i]));
              } else if (stat.isFile() && (!spec || files[i].match(spec))) {
                paths.push(folder + "\\" + files[i]);
              }
            }

            return paths;
          }

          return filesInFolder(path);
        },
        arguments: process.argv.slice(2),
        standardOut: {
          Write: function (str) {
            process.stdout.write(str);
          },
          WriteLine: function (str) {
            process.stdout.write(str + '\n');
          },
          Close: function () {
          }
        }
      };
    };

    return getNodeEnvironment();
  })();
})(TypeScript || (TypeScript = {}));

(function (IOUtils) {
  function createDirectoryStructure(ioHost, dirName) {
    if (ioHost.directoryExists(dirName)) {
      return;
    }

    var parentDirectory = ioHost.dirName(dirName);
    if (parentDirectory != "") {
      createDirectoryStructure(ioHost, parentDirectory);
    }
    ioHost.createDirectory(dirName);
  };

  function throwIOError(message, error) {
    var errorMessage = message;
    if (error && error.message) {
      errorMessage += (" " + error.message);
    }
    throw new Error(errorMessage);
  }
  IOUtils.throwIOError = throwIOError;

  function combine(prefix, suffix) {
    return prefix + "/" + suffix;
  }
  IOUtils.combine = combine;

  var BufferedTextWriter = (function () {
    function BufferedTextWriter(writer, capacity) {
      if (typeof capacity === "undefined") { capacity = 1024; }
      this.writer = writer;
      this.capacity = capacity;
      this.buffer = "";
    }
    BufferedTextWriter.prototype.Write = function (str) {
      this.buffer += str;
      if (this.buffer.length >= this.capacity) {
        this.writer.Write(this.buffer);
        this.buffer = "";
      }
    };
    BufferedTextWriter.prototype.WriteLine = function (str) {
      this.Write(str + '\r\n');
    };
    BufferedTextWriter.prototype.Close = function () {
      this.writer.Write(this.buffer);
      this.writer.Close();
      this.buffer = null;
    };
    return BufferedTextWriter;
  })();
  IOUtils.BufferedTextWriter = BufferedTextWriter;
})(TypeScript.IOUtils || (TypeScript.IOUtils = {}));
var IOUtils = TypeScript.IOUtils;

TypeScript.IO = (function () {
  function getNodeIO() {
    var _fs = require('fs');
    var _path = require('path');
    var _module = require('module');

    return {
      appendFile: function (path, content) {
        _fs.appendFileSync(path, content);
      },
      readFile: function (file, codepage) {
        return fs.readFileSync(file, codepage);
      },

      fileExists: function (path) {
        return _fs.existsSync(path);
      },
      
      dir: function dir(path, spec, options) {
        options = options || {};

        function filesInFolder(folder) {
          var paths = [];

          try  {
            var files = _fs.readdirSync(folder);
            for (var i = 0; i < files.length; i++) {
              var stat = _fs.statSync(folder + "/" + files[i]);
              if (options.recursive && stat.isDirectory()) {
                paths = paths.concat(filesInFolder(folder + "/" + files[i]));
              } else if (stat.isFile() && (!spec || files[i].match(spec))) {
                paths.push(folder + "/" + files[i]);
              }
            }
          } catch (err) {
          }

          return paths;
        }

        return filesInFolder(path);
      },
      createDirectory: function (path) {
        try  {
          if (!this.directoryExists(path)) {
            _fs.mkdirSync(path);
          }
        } catch (e) {
          IOUtils.throwIOError(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.Could_not_create_directory_0, [path]), e);
        }
      },
      directoryExists: function (path) {
        return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
      },
      resolvePath: function (path) {
        return _path.resolve(path);
      },
      dirName: function (path) {
        var dirPath = _path.dirname(path);

        if (dirPath === path) {
          dirPath = null;
        }

        return dirPath;
      },
      findFile: function (rootPath, partialFilePath) {
        var path = rootPath + "/" + partialFilePath;

        while (true) {
          if (_fs.existsSync(path)) {
            return { fileInformation: this.readFile(path), path: path };
          } else {
            var parentPath = _path.resolve(rootPath, "..");

            if (rootPath === parentPath) {
              return null;
            } else {
              rootPath = parentPath;
              path = _path.resolve(rootPath, partialFilePath);
            }
          }
        }
      },
      print: function (str) {
        process.stdout.write(str);
      },
      printLine: function (str) {
        process.stdout.write(str + '\n');
      },
      arguments: process.argv.slice(2),
      stderr: {
        Write: function (str) {
          process.stderr.write(str);
        },
        WriteLine: function (str) {
          process.stderr.write(str + '\n');
        },
        Close: function () {
        }
      },
      stdout: {
        Write: function (str) {
          process.stdout.write(str);
        },
        WriteLine: function (str) {
          process.stdout.write(str + '\n');
        },
        Close: function () {
        }
      },
      watchFile: function (fileName, callback) {
        var firstRun = true;
        var processingChange = false;

        var fileChanged = function (curr, prev) {
          if (!firstRun) {
            if (curr.mtime < prev.mtime) {
              return;
            }

            _fs.unwatchFile(fileName, fileChanged);
            if (!processingChange) {
              processingChange = true;
              callback(fileName);
              setTimeout(function () {
                processingChange = false;
              }, 100);
            }
          }
          firstRun = false;
          _fs.watchFile(fileName, { persistent: true, interval: 500 }, fileChanged);
        };

        fileChanged();
        return {
          fileName: fileName,
          close: function () {
            _fs.unwatchFile(fileName, fileChanged);
          }
        };
      },
      run: function (source, fileName) {
        require.main.fileName = fileName;
        require.main.paths = _module._nodeModulePaths(_path.dirname(_fs.realpathSync(fileName)));
        require.main._compile(source, fileName);
      },
      getExecutingFilePath: function () {
        return process.mainModule.filename;
      },
      quit: function (code) {
        var stderrFlushed = process.stderr.write('');
        var stdoutFlushed = process.stdout.write('');
        process.stderr.on('drain', function () {
          stderrFlushed = true;
          if (stdoutFlushed) {
            process.exit(code);
          }
        });
        process.stdout.on('drain', function () {
          stdoutFlushed = true;
          if (stderrFlushed) {
            process.exit(code);
          }
        });
        setTimeout(function () {
          process.exit(code);
        }, 5);
      }
    };
  };

  return getNodeIO();
})();


var SourceFile = (function () {
  function SourceFile(scriptSnapshot, byteOrderMark) {
    this.scriptSnapshot = scriptSnapshot;
    this.byteOrderMark = byteOrderMark;
  }
  return SourceFile;
})();

var DiagnosticsLogger = (function () {
  function DiagnosticsLogger(ioHost) {
    this.ioHost = ioHost;
  }
  DiagnosticsLogger.prototype.information = function () {
    return false;
  };
  DiagnosticsLogger.prototype.debug = function () {
    return false;
  };
  DiagnosticsLogger.prototype.warning = function () {
    return false;
  };
  DiagnosticsLogger.prototype.error = function () {
    return false;
  };
  DiagnosticsLogger.prototype.fatal = function () {
    return false;
  };
  DiagnosticsLogger.prototype.log = function (s) {
    this.ioHost.stdout.WriteLine(s);
  };
  return DiagnosticsLogger;
})();

var FileLogger = (function () {
  function FileLogger(ioHost) {
    this.ioHost = ioHost;
    var file = "tsc." + Date.now() + ".log";

    this.fileName = this.ioHost.resolvePath(file);
  }
  FileLogger.prototype.information = function () {
    return false;
  };
  FileLogger.prototype.debug = function () {
    return false;
  };
  FileLogger.prototype.warning = function () {
    return false;
  };
  FileLogger.prototype.error = function () {
    return false;
  };
  FileLogger.prototype.fatal = function () {
    return false;
  };
  FileLogger.prototype.log = function (s) {
    this.ioHost.appendFile(this.fileName, s + '\r\n');
  };
  return FileLogger;
})();

var BatchCompiler = (function () {
  function BatchCompiler(ioHost, options) {
    this.ioHost = ioHost;
    this.compilerVersion = "0.9.7.0";
    this.fileNameToSourceFile = new TypeScript.StringHashTable();
    this.hasErrors = false;
    this.logger = null;
    this.fileExistsCache = TypeScript.createIntrinsicsObject();
    this.resolvePathCache = TypeScript.createIntrinsicsObject();
    this.diagnostics = [];
    this.options = options;
    this.optionIsValid = this.parseOptions();
    this.logger = new TypeScript.NullLogger();
  }
  BatchCompiler.prototype.batchCompile = function (files) {
    var _this = this;
    var start = new Date().getTime();

    TypeScript.CompilerDiagnostics.diagnosticWriter = { Alert: function (s) {
      _this.ioHost.printLine(s);
    }};

    if (this.optionIsValid) {
      var libraryResolvedFile = {
        path: this.getDefaultLibraryFilePath(),
        referencedFiles: [],
        importedFiles: []
      };
      files = [libraryResolvedFile].concat(files);
      return this.compile(files);
    }
    return null;
  };

  BatchCompiler.prototype.resolve = function(files) {
    if (this.optionIsValid) {
      return this.doResolve(files);
    }
    return [];
  };

  BatchCompiler.prototype.doResolve = function (files) {
    var _this = this;
    var resolvedFiles = [];

    var start = new Date().getTime();
    var resolutionResults = TypeScript.ReferenceResolver.resolve(files, this, this.compilationSettings.useCaseSensitiveFileResolution());
    resolvedFiles = resolutionResults.resolvedFiles;

    resolutionResults.diagnostics.forEach(function (d) {
      return _this.addDiagnostic(d);
    });
    return resolvedFiles;
  };

  BatchCompiler.prototype.compile = function (resolvedFiles) {
    var _this = this;
    var compiler = new TypeScript.TypeScriptCompiler(this.logger, this.compilationSettings);

    resolvedFiles.forEach(function (resolvedFile) {
      var sourceFile = _this.getSourceFile(resolvedFile.path);
      compiler.addFile(resolvedFile.path, sourceFile.scriptSnapshot, sourceFile.byteOrderMark, 0, false, resolvedFile.referencedFiles);
    });

    var results = [];
    for (var it = compiler.compile(function (path) {
      return _this.resolvePath(path);
    }); it.moveNext();) {
      var result = it.current();

      result.diagnostics.forEach(function (d) {
        return _this.addDiagnostic(d);
      });
      results.push(result.outputFiles);
    }
    return results;
  };

  BatchCompiler.prototype.parseOptions = function () {
    var _this = this;

    var mutableSettings = new TypeScript.CompilationSettings();
    if (this.options.outDir) {
      mutableSettings.outDirOption = this.options.outDir;
    }

    if (this.options.sourceMap) {
      mutableSettings.mapSourceFiles = true;
    }

    if (this.options.mapRoot) {
      mutableSettings.mapRoot = this.option.mapRoot;
    }

    if (this.options.sourceRoot) {
      mutableSettings.sourceRoot = this.options.sourceRoot;
    }

    if (this.options.removeComments) {
      mutableSettings.removeComments = this.removeComments;
    }

    if (this.options.target) {
      if (this.options.target === 'es3') {
        mutableSettings.codeGenTarget = 0 /* EcmaScript3 */;
      } else if (this.options.target === 'es5') {
        mutableSettings.codeGenTarget = 1 /* EcmaScript5 */;
      } else {
        mutableSettings.codeGenTarget = 'es3';
      }
    }

    if (this.options.module) {
      if (this.options.module === 'commonjs') {
        mutableSettings.moduleGenTarget = 1 /* Synchronous */;
      } else if (this.options.module === 'amd') {
        mutableSettings.moduleGenTarget = 2 /* Asynchronous */;
      } else {
        mutableSettings.moduleGenTarget = 1;
      }
    }

    if (this.options.useCaseSensitiveFileResolution) {
      mutableSettings.useCaseSensitiveFileResolution = true;
    }

    var locale = null;
    if (this.options.locale) {
      locale = this.options.locale;
    }

    if (this.options.noImplicitAny) {
      mutableSettings.noImplicitAny = true;
    }

    this.compilationSettings = TypeScript.ImmutableCompilationSettings.fromCompilationSettings(mutableSettings);
    
    if (locale) {
      if (!this.setLocale(locale)) {
        return false;
      }
    }

    return !this.hasErrors;
  };

  BatchCompiler.prototype.setLocale = function (locale) {
    var matchResult = /^([a-z]+)([_\-]([a-z]+))?$/.exec(locale.toLowerCase());
    if (!matchResult) {
      this.addDiagnostic(new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, ['en', 'ja-jp']));
      return false;
    }

    var language = matchResult[1];
    var territory = matchResult[3];

    if (!this.setLanguageAndTerritory(language, territory) && !this.setLanguageAndTerritory(language, null)) {
      this.addDiagnostic(new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Unsupported_locale_0, [locale]));
      return false;
    }

    return true;
  };

  BatchCompiler.prototype.setLanguageAndTerritory = function (language, territory) {
    var compilerFilePath = this.ioHost.getExecutingFilePath();
    var containingDirectoryPath = this.ioHost.dirName(compilerFilePath);

    var filePath = TypeScript.IOUtils.combine(containingDirectoryPath, language);
    if (territory) {
      filePath = filePath + "-" + territory;
    }

    filePath = this.resolvePath(TypeScript.IOUtils.combine(filePath, "diagnosticMessages.generated.json"));

    if (!this.fileExists(filePath)) {
      return false;
    }

    var fileContents = this.ioHost.readFile(filePath, this.compilationSettings.codepage());
    TypeScript.LocalizedDiagnosticMessages = JSON.parse(fileContents.contents);
    return true;
  };

  BatchCompiler.prototype.getSourceFile = function (fileName) {
    var sourceFile = this.fileNameToSourceFile.lookup(fileName);
    if (!sourceFile) {
      var fileInformation;

      try  {
        fileInformation = this.ioHost.readFile(fileName, 'utf8');
      } catch (e) {
        this.addDiagnostic(new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file_0_1, [fileName, e.message]));
        fileInformation = '';
      }

      var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation);
      var sourceFile = new SourceFile(snapshot, '');
      this.fileNameToSourceFile.add(fileName, sourceFile);
    }

    return sourceFile;
  };

  BatchCompiler.prototype.getDefaultLibraryFilePath = function () {
    var compilerFilePath = require.resolve('typescript');
    var containingDirectoryPath = this.ioHost.dirName(compilerFilePath);
    var libraryFilePath = this.resolvePath(TypeScript.IOUtils.combine(containingDirectoryPath, "lib.d.ts"));

    return libraryFilePath;
  };

  BatchCompiler.prototype.getScriptSnapshot = function (fileName) {
    return this.getSourceFile(fileName).scriptSnapshot;
  };

  BatchCompiler.prototype.resolveRelativePath = function (path, directory) {
    var start = new Date().getTime();

    var unQuotedPath = TypeScript.stripStartAndEndQuotes(path);
    var normalizedPath;

    if (TypeScript.isRooted(unQuotedPath) || !directory) {
      normalizedPath = unQuotedPath;
    } else {
      normalizedPath = TypeScript.IOUtils.combine(directory, unQuotedPath);
    }

    normalizedPath = this.resolvePath(normalizedPath);

    normalizedPath = TypeScript.switchToForwardSlashes(normalizedPath);

    return normalizedPath;
  };

  BatchCompiler.prototype.fileExists = function (path) {
    var exists = this.fileExistsCache[path];
    if (exists === undefined) {
      var start = new Date().getTime();
      exists = this.ioHost.fileExists(path);
      this.fileExistsCache[path] = exists;
      TypeScript.compilerFileExistsTime += new Date().getTime() - start;
    }

    return exists;
  };

  BatchCompiler.prototype.getParentDirectory = function (path) {
    var start = new Date().getTime();
    var result = this.ioHost.dirName(path);
    TypeScript.compilerDirectoryNameTime += new Date().getTime() - start;

    return result;
  };

  BatchCompiler.prototype.addDiagnostic = function (diagnostic) {
    var diagnosticInfo = diagnostic.info();
    if (diagnosticInfo.category === 1 /* Error */) {
      this.hasErrors = true;
    }
    this.diagnostics.push(TypeScript.TypeScriptCompiler.getFullDiagnosticText(diagnostic));
  };

  BatchCompiler.prototype.directoryExists = function (path) {
    var start = new Date().getTime();
    var result = this.ioHost.directoryExists(path);
    TypeScript.compilerDirectoryExistsTime += new Date().getTime() - start;
    return result;
  };

  BatchCompiler.prototype.resolvePath = function (path) {
    var cachedValue = this.resolvePathCache[path];
    if (!cachedValue) {
      var start = new Date().getTime();
      cachedValue = this.ioHost.resolvePath(path);
      this.resolvePathCache[path] = cachedValue;
      TypeScript.compilerResolvePathTime += new Date().getTime() - start;
    }

    return cachedValue;
  };
  return BatchCompiler;
})();
TypeScript.BatchCompiler = BatchCompiler;


function Api(opt) {
  this._compiler = new TypeScript.BatchCompiler(TypeScript.IO, opt);
}


Api.prototype.resolve = function(files) {
  return {
    resolved: this._compiler.resolve(Array.isArray(files)? files: [files]),
    diagnostics: this._compiler.diagnostics || []
  };
};


Api.prototype.compile = function(resolved) {
  return {
    compiled: this._compiler.batchCompile(resolved),
    diagnostics: this._compiler.diagnostics || []
  };
};


module.exports =  Api;
