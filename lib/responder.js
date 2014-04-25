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
var tsapi = require('typescript.api');
var path = require('path');
var domain = require('domain');

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
        var base = pathutil.resolve(process.cwd() + this._conf.urlRoot);
        return this._response.end(ejs.render(DEPS_TEMPLATE, {main : pathutil.relative(base, path)}));
      }
      this._response.end(ejs.render(ERROR_TEMPLATE, {error: opt_diagnostic, file: path, title: 'TypeScript compile error.'}));
    }.bind(this));
  }.bind(this));
};


Responder.prototype._processDiagnostics = function(resolved) {
  return _.map(resolved, function(k, v) {
    return _.map(v.diagnostics, function(k, v) {
      return v.toString();
    }).join('\n');
  }).join('\n\n');
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
    var outDir = this._conf.dest;
    var rootDir = this._conf.basePath;
    var js = outDir + '/' + parsed.query.path;
    var ts = rootDir + '/' + parsed.query.path.replace(/\.js$/, '.ts');
    tsapi.resolve([ts], function(resolved) {
      if (!tsapi.check(resolved)) {
        return cb(false, ts, this._processDiagnostics(resolved));
      }

      if (!this._mtime.compareMtime(resolved, outDir, rootDir)) {
        return cb(true, js);
      }

      tsapi.compile(resolved, function(compiled) {
        if(!tsapi.check(compiled)) {
          return cb(false, ts, this._processDiagnostics(compiled));
        } else {            
          this._mtime.updateMtime(compiled);
        }
        cb(true, js);
      }.bind(this));
    }.bind(this));
  } catch (x) {
    cb(false, ts, x.stack);
  }
};


module.exports = function(conf) {
  tsapi.reset(conf.typescript);
  return function(req, res, next) {
    var mtime = new Mtime();
    new Responder(mtime, conf, req, res).respond(next);
  };
};
