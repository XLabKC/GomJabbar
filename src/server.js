var async = require('async');
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
   this.sourceResources = options.sourceResources;
   this.testResources = options.testResources;
   this.testResourcesDir = options.testResourcesDir;
   this.sourceResourcesDir = options.sourceResourcesDir;
   this.gomJabbarResources = ['gom-jabbar.js', 'mocha.js'];

   if (!this.sourceDir) throw new Error('Missing: option.sourceDir');
   if (!this.testDir) throw new Error('Missing: option.testDir');

   // Set up mincor environment.
   this.environment = new Mincer.Environment();
   this.environment.appendPath(this.sourceDir);
   this.environment.appendPath(this.testDir);

   this.app = express();

   // Serves the assets required for every test.   
   if (this.testResourcesDir) {
      this.app.use(express.static(this.testResourcesDir));
   }

   // Serves the assets required for the source to run.
   if (this.sourceResourcesDir) {
      this.app.use(express.static(this.sourceResourcesDir));
   }

   // Filters out favicon.ico calls.
   this.app.get('favicon.ico', function (req, res) {
      res.status(404).send('No favicon!');
   });

   // Serve the gom jabbar client-side runner and the mocha framework.
   this.app.use('/gom-jabbar-resources', express.static(path.join(__dirname, 'resources')));

   // Serve the src resources.
   if (this.sourceResources) {
      var srcEnv = this.createEnvironmentForFiles(this.sourceResources);
      this.app.use('/src-resources', Mincer.createServer(srcEnv));
   }   

   // Serve the test resources.
   if (this.testResources) {
      var testEnv = this.createEnvironmentForFiles(this.testResources);
      this.app.use('/test-resources', Mincer.createServer(testEnv));
   }   

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
   html.push('<link rel="stylesheet" href="/gom-jabbar-resources/mocha.css" />');
   html.push('</head>');
   html.push('<body>');
   html.push('<div id="mocha"></div>');

   for (var i = 0; i < this.gomJabbarResources.length; i++) {
      html.push('<script src="/gom-jabbar-resources/' + this.gomJabbarResources[i] + '"></script>');   
   }
   
   if (this.testResourcesDir) {
      html.push(this.generateScriptTagsForDirectory(this.testResourcesDir));
   }

   if (this.testResources) {
      html.push(this.generateScriptTagsForResourceFiles(this.testResources, '/test-resources'));  
   }

   html.push('<script>mocha.setup("bdd")</script>');

   if (this.sourceResourcesDir) {
      html.push(this.generateScriptTagsForDirectory(this.sourceResourcesDir));
   }

   if (this.sourceResources) {
      html.push(this.generateScriptTagsForResourceFiles(this.sourceResources, '/src-resources'));
   }

   html.push('<script src="' + path.join('/scripts', testFile) + '"></script>');
   html.push('<script>runTests()</script>');
   html.push('</body>');
   html.push('</html>');
   return html.join('');
};

Server.prototype.generateScriptTagsForDirectory = function(directory) {
   var html = [];
   var files = fs.readdirSync(directory);
   var order = [];
   if (files.indexOf('.order') !== -1) {
      var orderFile = fs.readFileSync(path.join(directory, '.order'), 'utf8');
      order = orderFile.split('\n');
   }

   // Add script tags for ordered files first.
   for (var i = 0; i < order.length; i++) {
      if (files.indexOf(order[i]) !== -1) {
         html.push('<script src="/' + order[i] + '"></script>');
      }
   }
   
   // Add any remaining files.
   for (i = 0; i < files.length; i++) {
      if (order.indexOf(files[i]) === -1 && files[i] !== '.order') {
         html.push('<script src="/' + files[i] + '"></script>');
      } 
   }
   return html.join('');
};

Server.prototype.generateScriptTagsForResourceFiles = function(files, prefix) {
   var html = [];
   for (var i = 0; i < files.length; i++) {
      html.push('<script src="' + path.join(prefix, path.basename(files[i])) + '"></script>');
   }
   return html.join('');
}

Server.prototype.createEnvironmentForFiles = function(files) {
   var environment = new Mincer.Environment();
   var directories = [];
   for (var i = 0; i < files.length; i++) {
      var dir = path.dirname(files[i]);
      if (dir && directories.indexOf(dir) == -1) {
         directories.push(dir);
         environment.appendPath(dir);
      }   
   }
   return environment;
}

module.exports = Server;
