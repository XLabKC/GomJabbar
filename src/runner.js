var async = require('async');
var path = require('path');
var webdriver = require('selenium-webdriver');
var EventEmitter = require('events');
var util = require('util');

function Runner(server) {
  EventEmitter.call(this);
  this.server = server;
  this.url = 'http://localhost:' + this.server.port;
}
util.inherits(Runner, EventEmitter);

Runner.prototype.testOnAllBrowsers = function(done) {
   var browsers = [
      webdriver.Capabilities.chrome(),
      webdriver.Capabilities.firefox(),
      webdriver.Capabilities.safari(),
      webdriver.Capabilities.ie()
   ];
   var totalFailCount = 0;
   var totalPassCount = 0;
   this.emit('start-series', {browsers:browsers});
   async.eachSeries(browsers, (function(browser, done) {
      this.testOnBrowser(browser, function(err, result) {
         if (result) {
            totalFailCount += result.failed;
            totalPassCount += result.passed; 
         }
         done();
      });
   }).bind(this), (function() {
      var result = {failed: totalFailCount, passed: totalPassCount};
      this.emit('end-series', result);
      if (done) done(null, result);
   }).bind(this));
};

Runner.prototype.testOnBrowser = function(browser, done) {
   var name = browser.get('browserName');
   this.emit('start', {browser: name});

   try {
      var status = null;
      var driver = new webdriver.Builder().withCapabilities(browser).build();   
      driver.get(this.url).then(null, function () {
         // Capture the exception thrown by driver if browser doesn't exist.
      });
      driver.wait(function () {
         var script = 'if (window.getTestStatus) { return getTestStatus(); } else { return null; }'
         return driver.executeScript(script).then(function (result) {
            status = result;
            return result && result.finished;
         });
      }, 10000).then((function () {
         driver.quit();
         this.emit('end', {browser: name, status: status});
         if (done) done(null, status);
      }).bind(this), (function (err) {
         try {
            driver.quit();
         } catch (err) {}
         this.emit('skip', {browser: name, error: err});
         if (done) done(err);
      }).bind(this));
   } catch (err) {
      // This browser is not available.
      this.emit('skip', {browser: name, error: err});
      if (done) done(err);
   }
};


module.exports = Runner;
