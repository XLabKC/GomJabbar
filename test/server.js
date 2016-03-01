require('mocha');
var expect = require('chai').expect;
var request = require('supertest');
var fs = require('fs');
var Server = require('../src/server.js');

var PORT = 5000;
var SERVER_URL = 'http://localhost:5000';

describe('Server', function() {

   before(function(done) {
      this.server = new Server({
         port: PORT,
         sourceDir: './test/resources/src',
         testDir: './test/resources/test',
         sourceResourceDir: './test/resources/srcResources',
         testResourceDir: './test/resources/testResources'
      });
      this.server.start(done);
   });

   afterEach(function(done) {
      fs.unlink('./test/resources/test/all_tests.js', function() {
         done();
      });
   });

   describe('page generation', function() {

      it('should include the default resources', function(done) {
         request(SERVER_URL)
            .get('/')
            .expect(200)
            .expect(function(res) {
               expect(res.text).to.contain('<script src="/resources/gom-jabbar.js"></script>');
               expect(res.text).to.contain('<script src="/resources/mocha.js"></script>');
               expect(res.text).to.contain('<link rel="stylesheet" href="/resources/mocha.css" />');
            })
            .end(done);
      });

      it('should include the src resources', function(done) {
         request(SERVER_URL)
            .get('/')
            .expect(200)
            .expect(function(res) {
               expect(res.text).to.contain('<script src="/src-dep.js"></script>');
            })
            .end(done);
      });

      it('should include the mocha setup script', function(done) {
         request(SERVER_URL)
            .get('/')
            .expect(200)
            .expect(function(res) {
               expect(res.text).to.contain('<script>mocha.setup("bdd")</script>');
            })
            .end(done);
      });

      it('should include the run script', function(done) {
         request(SERVER_URL)
            .get('/')
            .expect(200)
            .expect(function(res) {
               expect(res.text).to.contain('<script>runTests()</script>');
            })
            .end(done);
      });

      it('should include the all_tests.js script when at the root', function(done) {
         request(SERVER_URL)
            .get('/')
            .expect(200)
            .expect(function(res) {
               expect(res.text).to.contain('<script src="/scripts/all_tests.js">');
            })
            .end(done);
      });

      it('should include the correct for the path when not at the root', function(done) {
         request(SERVER_URL)
            .get('/foo_test.js')
            .expect(200)
            .expect(function(res) {
               expect(res.text).to.contain('<script src="/scripts/foo_test.js">');
            })
            .end(done);
      });
   });

   describe('script serving', function() {

      it('should server the gom-jabbar resource', function(done) {
         request(SERVER_URL)
            .get('/resources/gom-jabbar.js')
            .expect(200)
            .expect('Content-Type', /javascript/)
            .expect(function(res) {
               var source = fs.readFileSync('./src/resources/gom-jabbar.js').toString();
               expect(res.text).to.equal(source);
            })
            .end(done);
      });

      it('should server the source resources', function(done) {
         request(SERVER_URL)
            .get('/src-dep.js')
            .expect(200)
            .expect('Content-Type', /javascript/)
            .expect(function(res) {
               var source = fs.readFileSync('./test/resources/srcResources/src-dep.js').toString();
               expect(res.text).to.equal(source);
            })
            .end(done);
      });

      it('should server the test resources', function(done) {
         request(SERVER_URL)
            .get('/test-dep.js')
            .expect(200)
            .expect('Content-Type', /javascript/)
            .expect(function(res) {
               var source = fs.readFileSync('./test/resources/testResources/test-dep.js').toString();
               expect(res.text).to.equal(source);
            })
            .end(done);
      });

      it('should server the test resources', function(done) {
         request(SERVER_URL)
            .get('/test-dep.js')
            .expect(200)
            .expect('Content-Type', /javascript/)
            .expect(function(res) {
               var source = fs.readFileSync('./test/resources/testResources/test-dep.js').toString();
               expect(res.text).to.equal(source);
            })
            .end(done);
      });

      it('should server the all_tests.js file', function(done) {
         // Prepare the server.
         request(SERVER_URL)
            .get('/')
            .expect(200, function() {
               request(SERVER_URL)
                  .get('/scripts/all_tests.js')
                  .expect(200)
                  .expect('Content-Type', /javascript/)
                  .expect(function(res) {
                     expect(res.text).to.contain('describe(\'Foo\', function() {');
                     expect(res.text).to.contain('require_tree');
                  })
                  .end(done);
            });
      });

      it('should server an individual test file', function(done) {
         // Prepare the server.
         request(SERVER_URL)
            .get('/foo_test.js')
            .expect(200, function() {
               request(SERVER_URL)
                  .get('/scripts/foo_test.js')
                  .expect(200)
                  .expect('Content-Type', /javascript/)
                  .expect(function(res) {
                     expect(res.text).to.contain('describe(\'Foo\', function() {');
                     expect(res.text).to.not.contain('require_tree');
                  })
                  .end(done);
            });
      });
   });
});
