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
}));
```


## Example

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
