/**
 * @fileoverview
 * @author Taketoshi Aono
 */

var connect = require('connect');
var tscMiddleware = require('../index');

connect().use('/typescript', tscMiddleware({
  typescript: {
    languageVersion          : "EcmaScript3", // (default)EcmaScript5 | EcmaScript3
    moduleGenTarget             : "Asynchronous", // (default)Synchronous | ASynchronous
    removeComments             : true,          // (default) true
    generateDeclarationFiles : false,          // (default) false
    mapSourceFiles           : false,         // (default) false
    noImplicitAny            : false,         // (default) false
    allowBool                : false,         // (default) false
    outputMany               : true           // (default) true
  }
})).use(connect.static('./stat')).listen(8282);
