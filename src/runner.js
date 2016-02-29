var async = require('async');
var colors = require('colors');
var path = require('path');
var webdriver = require('selenium-webdriver');





module.exports = {
   runManual: function () {
      var server = require('./test.server')(function (port) {
         console.log('Running in manual mode. Point your browser to "localhost:' + port + '".');
      });
   },
   runAll: function (callback) {
     var server = require('./test.server')(function (port) {
         // Automatically run the tests using Selenium.
         var url = 'http://localhost:' + port;
         var browsers = [
            webdriver.Capabilities.chrome(),
            webdriver.Capabilities.firefox(),
            webdriver.Capabilities.safari(),
            webdriver.Capabilities.ie()
         ];
         failCount = 0;
         passCount = 0;
         async.eachSeries(browsers, function (browser, done) {
            var name = browser.get('browserName');
            process.stdout.write('Testing on ' + name + ': ');
            runBrowserTest(browser, url, function (err, result) {
               // This browser is unavailable.
               if (err) {
                  process.stdout.write(colors.gray('Unavailable') + '\n');
                  return done();
               }
               failCount += result.failed;
               passCount += result.passed; 

               // Output results.
               outputResult(result);
               done();
            });
         }, function (err) {
            total = failCount + passCount;

            if (err) {
               console.log('\n\n' + colors.red('ERROR') + ':\n');
               console.log('  %s\n', err);
               callback("error", err);
            }
            var result = failCount === 0 ? colors.green('PASSED') : colors.red('FAILED');
            console.log('\n' + result + ': %d/%d passed\n', passCount, total);

            callback(failCount === 0 ? "passed" : "failed", {
               passed: passCount,
               failed: failCount
            });
         });
      }); 
   }
}

function runBrowserTest (browser, url, done) {
   var status = null;
   var driver = null; 

   // Try to build for browser.
   try {
      driver = new webdriver.Builder().withCapabilities(browser).build();   
      driver.get(url).then(null, function () {
         // Capture the exception thrown by driver if browser doesn't exist.
      });
      driver.wait(function () {
         var script = 'if (window.getTestStatus) { return getTestStatus(); } else { return null; }'
         return driver.executeScript(script).then(function (result) {
            status = result;
            return result && result.finished;
         });
      }, 10000).then(function () {
         driver.quit();
         done(null, status);
      }, function (err) {
         try {
            driver.quit();
         } catch (err) {}
         done(err);
      });
   } catch (err) {
      // This browser is not available.
      return done(err);
   }
};

function outputResult (result) {
   var output = colors.green(result.passed) + ' passed, ' + colors.red(result.failed) + ' failed\n';
   process.stdout.write(output);
   // If no failures, we can just return.
   if (result.failed === 0) return;
   console.log('FAILS:'.red);
   printObject(result.fails, '  ');
   console.log('');
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
