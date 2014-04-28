/**
 * @fileoverview
 * @author Taketoshi Aono
 */

var connect = require('connect');
var tscMiddleware = require('../index');

connect().use('/typescript', tscMiddleware({
  target          : "es3", // (default)EcmaScript5 | EcmaScript3
  module             : "amd", // (default)Synchronous | ASynchronous
  removeComments             : true,          // (default) true
  noImplicitAny            : false,         // (default) false
  allowBool                : false,         // (default) false
  sourceMap: true,
  urlRoot: './stat',
  basePath: './stat/ts',
  outDir: './stat/out',
  requirejsPath: './stat/node_modules/requirejs/require.js',
  requirejsConfigPath: null
})).use(connect.static('./stat')).listen(8282);
