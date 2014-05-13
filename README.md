## What's this

The on the fly typescript compile server for express/connect.

## Install

`npm install typescript-middleware`

## Usage

```javascript
var tscMiddleware = require('typescript-middleware');
var connect = require('connect');
var app = connect();
app.use('typescript', tscMiddleware({
  outDir: 'js/out', // The output directory of compilation result.
  sourceMap: true, // [OPTIONAL] Generate sourceMap file
  sourceRoot: '', // [OPTIONAL] Source root path.
  mapRoot: './ts', // [OPTIONAL] SourceMap root directory
  basePath: './ts', // Typescript root directory
  removeComments: false, // [OPTIONAL] [true/false] Save comments on generated source.
  target: 'es3', // [es3/es5] Target ecmascript environment.
  module: 'amd', // [amd/commonjs] Target javascript module.
  useCaseSensitiveFileResolution: true, // [OPTIONAL] [true/false] To use case sensitive module search.
  locale: 'en', // [OPTIONAL] [en/ja-jp] Locale.
  noImplicitAny: false, // [OPTIONAL] [true/false] Whether allow implicit any or not.
  requirejsPath: 'js/libs/requirejs/require.js', // The path to the requirejs
  requirejsConfigPath: 'js/requirejs.config.js', // The path to the requirejs config file.
  urlRoot: './', // The url root path.
  updateAll: true // [OPTIONAL] [true/false] Whether record all typescript file mtime before server running or not.
  respond: true // [OPTIONAL] [true/false] Respond compilation result as requirejs main.
}));
```

## Compilation

All typescript files are compiled if mtime is updated,  
to get mtime value, we use `fs.statSync`

## Options

**outDir**  

The output directory of the compilation results.


**sourceMap**  

[OPTIONAL] Generate sourceMap files.  
values: true/false  
default: false


**sourceRoot**  

[OPTIONAL] The source root path for typescript.


**mapRoot**  

[OPTIONAL] The source map root path.


**basePath**  

The typescript root path.


**removeComments**  

[OPTIONAL] Whether remove comments from generated source code or not.  
values: true/false  
default: true


**target**  

[OPTIONAL] Target runtime for generated source code.  
values: 'es3'/'es5'  
default: 'es5'


**module**  

[OPTIONAL] The module pattern for generated source code.  
values: 'amd'/'commonjs'  
default: 'amd'


**useCaseSensitiveFileResolution**  

[OPTIONAL] Whether search referenced module by case sensitive.  
value: true/false  
default: true


**locale**  

[OPTIONAL] The locale  
value: 'en'/'ja-jp'  
default: 'en'


**noImplicitAny**  

[OPTIONAL] disallow implicit any type.  
value: true/false
default: false


**requirejsPath**  

[OPTIONAL] Specify requirejs path for auto running.  
This option affect only if respond option is true.  


**requirejsConfigPath**  

[OPTIONAL] Specify requirejs config file path.  
This option affect only if respond option is true.  


**urlRoot**  

The root path of static files.


**updateAll**  

[OPTIONAL] Collect mtime of the all modules, before accessed.
values: true/false
default: false


**respond**  

[OPTIONAL] Respond compilation result as requirejs main file.
values: true/false
default: true


**usePathname**  

[OPTIONAL] Use path name for decide compile target.  
If this option is false, compile target is decided by 'path' query parameter.
values: true/false
default: false


## Example(respond = true, usePathname = false)

**Server**

```javascript
var connect = require('connect');
var app = connect();
app.use('typescript', tscMiddleware({
  basePath : '../ts/src',
  sourceMap: true,
  target: 'es3',
  module: 'amd',
  sourceMap: true,
  urlRoot: '../',
  outDir: '../js/output',
  requirejsPath: '../js/node_modules/requirejs/require.js',
  requirejsConfigPath: '../js/conf/requirejs.config.js',
  updateAll: true
})
.use(connect.static('../'))
.listen(8080);
```

**HTML**

```html
<!doctype html>
<html>
<head>
  <script type="text/javascript" src="//localhost:8080/typescript?path=main/foo/bar/main.ts"></script>
</head>
<body>
</body>
</html>
```


**Response**

```javascript
!function() {
  document.writeln('<script type="text/javascript" src="/js/conf/requirejs.config.js"><' + '/script>');
  document.writeln('<script type="text/javascript" src="/js/node_modules/requirejs/require.js" data-main="/js/output/foo/bar/main.js"><' + '/script>');
}();
```


## Example(respond = false, usePathname = true)

**Server**

```javascript
var connect = require('connect');
var app = connect();
app.use(tscMiddleware({
  basePath : '../ts/src',
  sourceMap: true,
  target: 'es3',
  module: 'amd',
  sourceMap: true,
  urlRoot: '../',
  outDir: '../js/output',
  requirejsPath: '../js/node_modules/requirejs/require.js',
  requirejsConfigPath: '../js/conf/requirejs.config.js',
  updateAll: true,
  respond: false,
  usePathname: true
})
.use(connect.static('../'))
.listen(8080);
```

**HTML**

```html
<!doctype html>
<html>
<head>
  <!-Specify output file.-->
  <script type="text/javascript" src="//localhost:8080/js/output/main/foo/bar/main.js"></script>
</head>
<body>
</body>
</html>
```

**typescript**

```typescript
class Main {}

export = Main;
```

**Response**

```javascript
var Main = (function () {
    function Main() {
    }
    return Main;
})();

module.exports = Main;
//# sourceMappingURL=main.js.map
```
