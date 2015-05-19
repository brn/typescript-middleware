/**
 * @fileoverview
 * @author Taketshi Aono
 */

'use strict';

var fs = require('fs');
var http = require('http');
var url = require('url');
var util = require('util');
var querystring = require('querystring');
var exec = require('child_process').exec;
var ejs = require('ejs');
var _ = require('lodash');
var glob = require('glob');
var path = require('path');
var domain = require('domain');
var mkdirp = require('mkdirp');
var Mtime = require('./mtime');
var pathutil = require('./pathutil');
var Compiler = require('./compiler');
var ReferenceResolver = require('./reference-resolver');
var OptionParser = require('./option-parser');

var ERROR_TEMPLATE = fs.readFileSync(__dirname + '/../tmpl/error.tmpl', 'utf8');
var DEPS_TEMPLATE = fs.readFileSync(__dirname + '/../tmpl/deps.tmpl', 'utf8');



/**
 * Typescript responder.
 * @constructor
 * @param {Object} conf
 */
function Middleware(mtime, conf, opt, req, res) {
  this._conf = conf;
  this._request = req;
  this._response = res;
  this._mtime = mtime;
  this._urlRoot = pathutil.resolve(this._conf.urlRoot);
  this._requirejsPath = this._conf.requirejsPath? '/' + pathutil.relative(this._urlRoot, pathutil.resolve(this._conf.requirejsPath)): '';
  this._requirejsConfigPath = this._conf.requirejsConfigPath? '/' + pathutil.relative(this._urlRoot, pathutil.resolve(this._conf.requirejsConfigPath)): '';
  this._compiler = new Compiler(opt);
  this._referenceResolver = new ReferenceResolver(opt);
}


/**
 * Process typescript and request.
 * @private
 * @param {Function} next
 */
Middleware.prototype.respond = function(next) {
  var parsed = url.parse(this._request.url, true);
  var d = domain.create();

  d.on('error', function(e) {
    if (this._conf.respond) {
      return this._response.end(ejs.render(fs.readFileSync(ERROR_TEMPLATE, 'utf-8'), {error: e.stack, file: path, title: 'TypeScript compile error.'}));
    }
    next(e.stack);
  });
  
  d.run(function() {
    this._processTypeScript(parsed, next, function(success, path, opt_diagnostic) {      
      if (this._conf.respond) {
        this._response.setHeader('Content-Type', 'text/javascript');
        if (success) {
          return this._response.end(ejs.render(DEPS_TEMPLATE, {
            main : pathutil.relative(this._urlRoot, path),
            requirejs: this._requirejsPath,
            requirejsConfig: this._requirejsConfigPath
          }));
        }
        this._response.end(ejs.render(ERROR_TEMPLATE, {error: opt_diagnostic || [], file: path, title: 'TypeScript compile error.'}));
      } else {
        if (success) {
          return next();
        }
        next(opt_diagnostic);
      }
    }.bind(this));
  }.bind(this));
};


Middleware.prototype._processDiagnostics = function(diagnostics) {
  return this._compiler.processDiagnostics(diagnostics);
};


/**
 * process typescript.
 * @private
 * @param {Object} parsed
 * @param {Function} next
 * @param {Function} cb
 */
Middleware.prototype._processTypeScript = function(parsed, next, cb) {
  try {
    var rootDir = this._conf.basePath || this._conf.rootDir;
    var outDir = this._conf.outDir;
    var path;
    var ts;
    var js;

    if (this._conf.usePathname) {
      path = pathutil.resolve(this._conf.urlRoot + '/' + parsed.pathname);
      ts = path.replace(pathutil.resolve(outDir), pathutil.resolve(rootDir)).replace(/\.js$/, '.ts');
      js = path;
    } else {
      path = parsed.query.path;
      if (!path) {
        return next();
      }
      ts = pathutil.resolve(rootDir + '/' + path.replace(/\.js$/, '.ts'));
      js = pathutil.resolve(outDir + '/' + path.replace(/\.ts$/, '.js'));
    }

    var exists = fs.existsSync(ts);

    if (!exists) {
      return next();
    }
    
    var resolved = this._referenceResolver.resolve(ts);
    var diagnostics;
    console.log('Resolve %s', ts);
    
    if (resolved.diagnostics.length > 0) {
      diagnostics = this._processDiagnostics(resolved.diagnostics);
      return cb(false, js, diagnostics);
    }
    
    if (!this._mtime.compareMtime(resolved.resolved, outDir, rootDir)) {
      return cb(true, js);
    }

    var compilationResult = this._compiler.compile(resolved.resolved, ts);
    
    if (compilationResult.diagnostics.length > 0) {
      diagnostics = this._processDiagnostics(compilationResult.diagnostics);
      console.log(diagnostics);
      return cb(false, js, diagnostics);
    }

    var fileList = resolved.resolved.map(function(resolved) {
      return resolved.path;
    });
    
    this._mtime.updateMtime(fileList);
    this._compiler.processCompilationResult(compilationResult.compiled);
    
    cb(true, js);
  } catch (x) {
    console.error(x.stack);
    cb(false, ts, x.message);
  }
};


module.exports = function(conf) {
  var mtime = new Mtime();
  if (conf.updateAll) {
    glob.sync((conf.basePath || conf.rootDir) + '/**/*.ts').forEach(function(file) {
      mtime.updateMtime(file);
    });
  }

  conf.respond = 'respond' in conf? conf.respond : true;
  
  var optionParser = new OptionParser();
  optionParser.parse(conf);
  return function(req, res, next) {
    new Middleware(mtime, conf, optionParser.getCompilationSettings(), req, res).respond(next);
  };
};
