#!/usr/bin/env node

var cli = require('cli');
var GomJabbar = require('../index');
var colors = require('colors');

cli.parse({
   srcDir: ['s', ' Directory containing the source files', 'directory', './src'],
   testDir: ['d', ' Directory containing the test files', 'directory', './test'],
   srcResourcesDir: ['r', ' Directory containing files that source depends on', 'directory'],
   testResourcesDir: ['x', ' Directory containing files that tests depends on', 'directory'],
   manual: ['m', 'Enables manual testing', 'bool', false],
   port:  ['p', 'Listen on this port', 'number', 4001]
});

cli.main(function(args, options) {
   GomJabbar.test(options, function(err, result) {
      if (err) {
         console.error('\n\n' + colors.red('ERROR') + ':\n');
         console.error('  %s\n', err);
         process.exit(1);
      }
      if (!options.manual) {
         process.exit(result.failed === 0 ? 0 : 1);
      }
   });
});