var async = require('async');
// var coffee = require('coffee-script');
var express = require('express');
var fs = require('fs');
var http = require('http');
var Mincer = require('mincer');
var path = require('path');
var url = require('url');


function Server(options) {
   options = options || {};
   this.port = options.port || 4001;
   this.sourceDir = options.sourceDir;
   this.testDir = options.testDir;
   this.testResourceDir = options.testResourceDir;
   this.sourceResourceDir = options.sourceResourceDir;
   this.gomJabbarResources = ['/resources/gom-jabbar.js', '/resources/mocha.js'];

   if (!this.sourceDir) throw new Error('Missing: option.sourceDir');
   if (!this.testDir) throw new Error('Missing: option.testDir');

   // Set up mincor environment.
   this.environment = new Mincer.Environment();
   this.environment.appendPath(this.sourceDir);
   this.environment.appendPath(this.testDir);

   this.app = express();

   // Serves the assets required for every test.   
   if (this.testResourceDir) {
      this.app.use(express.static(this.testResourceDir));
   }

   // Serves the assets required for the source to run.
   if (this.sourceResourceDir) {
      this.app.use(express.static(this.sourceResourceDir));
   }

   // Filters out favicon.ico calls.
   this.app.get('favicon.ico', function (req, res) {
      res.status(404).send('No favicon!');
   });

   // Serve the gom jabbar client-side runner and the mocha framework.
   this.app.use('/resources', express.static(path.join(__dirname, 'resources')));

   // for (var i = 0; i < this.gomJabbarResources.length; i++) {
   //    this.app.get(this.gomJabbarResources[i], this.serveStaticResource_);
   // }

   // Serves javascript assets. 
   this.app.get('/scripts/*', (function (req, res, next) {
      var pathName = url.parse(req.url).pathname.replace('/scripts/', '');
      res.setHeader('Content-Type', 'application/javascript');
      try {
         var asset = this.environment.findAsset(pathName);  
         var source = asset.toString(); 
         res.send(source);
      } catch (e) {
         // Create a block that will execute to show that the tests have failed to compile.
         var output = 'describe(\'Compilation\', function () { ' +
               'it(\'failed to compile\', function () { ' +
               'throw Error(\'' + JSON.stringify(e.message).replace(/'/g, '\\\'') + '\');' +
               '});});'
         res.send(output);
         console.error('\n%s\n', e.toString());
      }
   }).bind(this));

   // Serve a page that contains all of the files to test and all the test files.
   this.app.get('/', (function (req, res) {
      var allTestsPath = path.join(this.testDir, 'all_tests.js');
      fs.stat(allTestsPath, (function(err, stat) {
         // Create the all_tests.js file if it doesn't exist.
         if (err) fs.writeFileSync(allTestsPath, '//= require_tree .\n');
         res.send(this.generateHtml('all_tests.js'));   
      }).bind(this));
   }).bind(this));

   // Serves a page that tests a single test file against all files in the source directory.
   this.app.get('*', (function (req, res) {
      var pathName = url.parse(req.url).pathname.substring(1);
      res.send(this.generateHtml(pathName));
   }).bind(this));

   // Servers error message.
   this.app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.send({
         message: err.message,
         error: err
      });
   });
};

Server.prototype.start = function(callback) {
   http.createServer(this.app).listen(this.port, callback);
};

/** Generates the html for the test runner page. */
Server.prototype.generateHtml = function(testFile) {
   var html = ['<!DOCTYPE html><html>'];
   html.push('<head>');
   html.push('<title>Mocha</title>');
   html.push('<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">');
   html.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
   html.push('<link rel="stylesheet" href="/resources/mocha.css" />');
   html.push('</head>');
   html.push('<body>');
   html.push('<div id="mocha"></div>');

   for (var i = 0; i < this.gomJabbarResources.length; i++) {
      html.push('<script src="' + this.gomJabbarResources[i] + '"></script>');   
   }
   
   if (this.testResourceDir) {
      var files = fs.readdirSync(this.testResourceDir);
      for (var i = 0; i < files.length; i++) {
         html.push('<script src="/' + files[i] + '"></script>');
      }
   }

   html.push('<script>mocha.setup("bdd")</script>');

   if (this.sourceResourceDir) {
      var files = fs.readdirSync(this.sourceResourceDir);
      for (var i = 0; i < files.length; i++) {
         html.push('<script src="/' + files[i] + '"></script>');
      }
   }

   html.push('<script src="' + path.join('/scripts', testFile) + '"></script>');
   html.push('<script>runTests()</script>');
   html.push('</body>');
   html.push('</html>');
   return html.join('');
};

/** Responds with the resource at the given path. */
// Server.prototype.serveStaticResource_ = function(req, res, next) {
//    var resourceName = url.parse(req.url).pathname;
//    var resourcePath = path.join(__dirname, resourceName);
//    fs.readFile(resourcePath, function(err, data) {
//       if (err) {
//          res.status(500).send(err.message);
//          console.error('\n%s\n', e.toString());
//          return;
//       }
//       var ext = path.extname(resourceName);
//       console.log("RESOURCE: ", resourceName, ext);
//       if (ext === '.css') res.setHeader('Content-Type', 'text/css');
//       if (ext === '.js') res.setHeader('Content-Type', 'application/javascript');
//       res.send(data);
//    });
// };


module.exports = Server;
