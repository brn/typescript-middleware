/**
 * @fileoverview
 * @author Taketshi Aono
 */

'use strict';

var fs = require('fs');
var pathutil = require('./pathutil');
var glob = require('glob');


/**
 * @constructor
 */
function Mtime() {
  /**
   * @private
   */
  this._typeScriptSourceMtimeMap = {};
}


/**
 * Record .ts mtime.
 * @param {string} file
 */
Mtime.prototype.updateMtime = function(file) {
  this._update(file, this._typeScriptSourceMtimeMap);
};


/**
 * Compare mtime.
 * @param {ReferenceResolutionResult} referenceResolutionResult
 * @returns {boolean}
 */
Mtime.prototype.compareMtime = function(referenceResolutionResult, outDir, root) {
  var updated = false;
  referenceResolutionResult.forEach(function(result) {
    var path = pathutil.resolve(result.path);
    if (!fs.existsSync(path)) {
      return false;
    }
    var ret = false;
    if (path.indexOf('.d.ts') === -1) {
      var js = pathutil.resolve(outDir + '/' + pathutil.relative(pathutil.resolve(root), path)).replace(/\.ts$/, '.js');
      ret = !fs.existsSync(js);
    }

    if (!ret) {
      var newMtime = fs.statSync(path).mtime;
      var last = this._typeScriptSourceMtimeMap[path];
      if (!last) {
        this._typeScriptSourceMtimeMap[path] = newMtime;
        ret = true;
      } else {
        ret = last < newMtime;
      }
    }

    if (ret) {
      console.info('Typescript source file [%s] is updated.', path);
    }
    if (!updated) {
      updated = ret;
    }
  }.bind(this));
  return updated;
};


/**
 * Get .ts mtime.
 * @private
 * @param {string} files
 */
Mtime.prototype._update = function(files, storage) {
  if (Array.isArray(files)) {
    files.forEach(this._doUpdate.bind(null, storage));
  } else {
    glob.sync(files).forEach(this._doUpdate.bind(null, storage));
  }
};


/**
 * @private
 * @param {Object} storage
 * @param {string} file
 */
Mtime.prototype._doUpdate = function(storage, file) {
  if (!fs.existsSync(file)) {
    return;
  }
  file = pathutil.resolve(file);
  var mtime = fs.statSync(file).mtime;
  storage[file] = mtime;
  console.log('resource [%s].mtime = %s', file, mtime.toUTCString());
};


module.exports = Mtime;
