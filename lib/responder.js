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
var pathutil = require('./pathutil');
var exec = require('child_process').exec;
var ejs = require('ejs');
var _ = require('lodash');
var Mtime = require('./mtime');
var glob = require('glob');
var path = require('path');
var domain = require('domain');
var Api = require('./tsc-api');
var mkdirp = require('mkdirp');

var ERROR_TEMPLATE = fs.readFileSync(__dirname + '/../tmpl/error.tmpl', 'utf8');
var DEPS_TEMPLATE = fs.readFileSync(__dirname + '/../tmpl/deps.tmpl', 'utf8');



/**
 * Typescript responder.
 * @constructor
 * @param {Object} conf
 */
function Responder(mtime, conf, req, res) {
  this._conf = conf;
  this._request = req;
  this._response = res;
  this._mtime = mtime;
  this._tsapi = new Api(this._conf);
  this._urlRoot = pathutil.resolve(this._conf.urlRoot);
  this._requirejsPath = this._conf.requirejsPath? pathutil.relative(this._urlRoot, pathutil.resolve(this._conf.requirejsPath)): '';
  this._requirejsConfigPath = this._conf.requirejsConfigPath? pathutil.relative(this._urlRoot, pathutil.resolve(this._conf.requirejsConfigPath)): '';
}


/**
 * Process typescript and request.
 * @private
 * @param {Function} next
 */
Responder.prototype.respond = function(next) {
  var parsed = url.parse(this._request.url, true);
  var d = domain.create();

  d.on('error', function(e) {
    this._response.end(ejs.render(fs.readFileSync(ERROR_TEMPLATE, 'utf-8'), {error: e.stack, file: path, title: 'TypeScript compile error.'}));
  });
  
  d.run(function() {
    this._response.setHeader('Content-Type', 'text/javascript');
    this._processTypeScript(parsed, function(success, path, opt_diagnostic) {
      if (success) {
        return this._response.end(ejs.render(DEPS_TEMPLATE, {
          main : pathutil.relative(this._urlRoot, path),
          requirejs: this._requirejsPath,
          requirejsConfig: this._requirejsConfigPath
        }));
      }
      this._response.end(ejs.render(ERROR_TEMPLATE, {error: opt_diagnostic, file: path, title: 'TypeScript compile error.'}));
    }.bind(this));
  }.bind(this));
};


Responder.prototype._processDiagnostics = function(diagnostics) {
  return _.map(diagnostics, function(v, k) {
    return v.toString();
  }).join('\n');
};


/**
 * process typescript.
 * @private
 * @param {Object} parsed
 * @param {Function} cb
 */
Responder.prototype._processTypeScript = function(parsed, cb) {
  try {
    console.log('Resolve %s', parsed.query.path);
    var rootDir = this._conf.basePath;
    var outDir = this._conf.outDir;
    var ts = rootDir + '/' + parsed.query.path.replace(/\.js$/, '.ts');
    var js = pathutil.resolve(outDir + '/' + parsed.query.path.replace(/\.ts$/, '.js'));
    var resolved = this._tsapi.resolve(ts);
    
    if (resolved.diagnostics.length > 0) {
      return cb(false, js, this._processDiagnostics(resolved.diagnostics));
    }
    
    if (!this._mtime.compareMtime(resolved.resolved, outDir, rootDir)) {
      return cb(true, js);
    }

    var compilationResult = this._tsapi.compile(resolved.resolved);

    if (compilationResult.diagnostics.length > 0) {
      return cb(false, js, this._processDiagnostics(compilationResult.diagnostics));
    }

    this._mtime.updateMtime(resolved.resolved);
    compilationResult.compiled.forEach(function(ret) {
      ret.forEach(function(ret) {
        try {
          mkdirp(path.dirname(ret.name));
          fs.writeFileSync(ret.name, ret.text, 'utf8');
        } catch(e) {
          return cb(false, js, e);
        }
      });
    });
    cb(true, js);
  } catch (x) {
    cb(false, ts, x.message);
  }
};


module.exports = function(conf) {
  conf.out = './all.js';
  var mtime = new Mtime();
  if (conf.updateAll) {
    glob.sync(conf.outDir + '/**/*.js').forEach(function(file) {
      mtime.updateMtime(file);
    });
  }
  return function(req, res, next) {
    new Responder(mtime, conf, req, res).respond(next);
  };
};
