var async = require('async');
var colors = require('colors');
var unitRunner = require('./test.runner');

if (process.argv.length >= 3 && process.argv[2]) {
   // Check for the 'manual' argument.
   for (var i = 2; i < process.argv.length; i++) {
      if (process.argv[i] === 'manual') {
         return unitRunner.runManual();
      }
   }
}

unitRunner.runAll(function (status) {
   process.exit(status == "passed" ? 0 : 1);
});
