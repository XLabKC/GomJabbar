var Runner = require('./src/runner.js');
var Server = require('./src/server.js');
var colors = require('colors');
var fs = require('fs');

var test = function(options, callback) {
   options = options || {};
   var port = options.port || 4001;
   var manual = options.manual || false;
   var sourceDir = options.srcDir || './src';
   var testDir = options.testDir || './test';
   var sourceResourcesDir = options.srcResourcesDir || null;
   var testResourcesDir = options.testResourcesDir || null;
   
   // Verify that the directories exist.
   if (!isValidDirectory(sourceDir)) return callback(errorForBadDir('sourceDir', sourceDir));
   if (!isValidDirectory(testDir)) return callback(errorForBadDir('testDir', testDir));
   if (sourceResourcesDir && !isValidDirectory(sourceResourcesDir)) {
      return callback(errorForBadDir('sourceResourcesDir', sourceResourcesDir));
   }
   if (testResourcesDir && !isValidDirectory(testResourcesDir)) {
      return callback(errorForBadDir('testResourcesDir', testResourcesDir));
   }

   var server = new Server({
      port: port,
      sourceDir: sourceDir,
      testDir: testDir,
      sourceResourcesDir: sourceResourcesDir,
      testResourcesDir: testResourcesDir
   });
   server.start(function(err) {
      if (err) return callback(err);
      if (manual) {
         console.log('Running in manual mode. Point your browser to "http://localhost:' + port + '".');
         return callback(null, {server: server, passed: 0, failed: 0});
      }

      var runner = new Runner(server);
      runner.on('start', onStartedTestingOnBrowser);
      runner.on('skip', onSkippedTestingOnBrowser);
      runner.on('end', onEndTestingOnBrowser);
      runner.testOnAllBrowsers(function(err, result) {
         if (err) return callback(err);
         var total = result.passed + result.failed;
         var text = result.failed === 0 ? colors.green('PASSED') : colors.red('FAILED');
         console.log('\n' + text + ': %d/%d passed\n', result.passed, total);

         callback(null, {server: server, passed: result.passed, failed: result.failed});
      });
   });
}

var isValidDirectory = function(directory) {
   try {
      fs.statSync(directory);
   } catch (err) {
      return false;
   }
   return true;
}

var errorForBadDir = function(paramName, directory) {
   return new Error('[' + paramName + '] Directory does not exist: ' + directory);  
}

var onStartedTestingOnBrowser = function(data) {
   process.stdout.write('Testing on ' + data.browser + ': ');
}

var onSkippedTestingOnBrowser = function(data) {
   process.stdout.write(colors.gray('Unavailable') + '\n');
}

var onEndTestingOnBrowser = function(result) {
   var output = colors.green(result.status.passed) + ' passed, ' +
         colors.red(result.status.failed) + ' failed\n';
   process.stdout.write(output);
   if (result.failed > 0) {
      console.log('FAILS:'.red);
      printObject(result.fails, '  ');
      console.log('');
   }
}

function printObject (object, prepend) {
   for (var key in object) {
      if (object.hasOwnProperty(key)) {
         var val = object[key];
         console.log('%s%s', prepend, key);
         if (typeof val === 'string') {
            console.log('%s  ✗ %s'.red, prepend, val);   
         } else {
            printObject(val, prepend + '  ');
         }
      }
   }
}


module.exports = {
   Runner: require('./src/runner.js'),
   Server: require('./src/server.js'),
   test: test
};
