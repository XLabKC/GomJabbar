#!/usr/bin/env node

var cli = require('cli');

cli.parse({
   srcDir: ['s', 'Directory containing the source files', 'directory'],
   testDir: ['d', 'Directory containing the test files', 'directory'],
   srcResourcesDir: ['', 'Directory containing files that source depends on', 'directory'],
   testResourcesDir: ['', 'Directory containing files that tests depends on', 'directory'],
   manual: ['m', 'Enables manual testing', 'true', false],
   port:  ['p', 'Listen on this port', 'number', 4001]
});

cli.main(function(args, options) {
   console.log(options);
   process.exit();
});