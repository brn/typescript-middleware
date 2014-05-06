/**
 * @fileoverview
 * @author Taketshi Aono
 */

'use strict';

var path = require('path');
var PATH_REG = /\\/g;


for (var prop in path) {
  if (typeof path[prop] === 'function') {
    exports[prop] = path[prop].bind(path);
  } else {
    exports[prop] = path[prop];
  }
}


exports.resolve = function() {
  return path.resolve.apply(path, arguments).replace(PATH_REG, '/');
};


/**
 * @param {string} from 開始位置
 * @param {string} to 目的のパス
 * @returns {string}
 * @throws {Error}
 */
exports.relative = function (from, to) {
  return path.relative(from, to).replace(PATH_REG, '/');
};


exports.basename = function(p) {
  return path.basename(p);
};


exports.dirname = function(p) {
  return path.dirname(p).replace(PATH_REG, '/');
};


exports.replace = function(path) {
  return path.replace(PATH_REG, '/');
};


exports.extname = function(p) {
  return path.extname(p);
};
