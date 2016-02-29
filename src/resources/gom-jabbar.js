(function() {
   var status = {
      finished: false,
      passed: 0,
      failed: 0,
      fails: {}
   }; 
   
   window.runTests = function runTests() {
      var runner = mocha.run(function (failures) {
         status.finished = true;
      });

      runner.on('pass', function (test) {
         status.passed++;
      });

      runner.on('fail', function (test, err) {
         status.failed++;

         // Find parents.
         var parents = [];
         var cur = test.parent;
         while (cur) {
            // Add two spaces on the end to avoid significant keywords (i.e. constructor).
            if (cur.title) parents.push(cur.title + '  ');
            cur = cur.parent;
         }

         // Add the test to the fail object.
         var curDepth = status.fails;
         for (var i = parents.length - 1; i >= 0; i--) {
            if (!curDepth[parents[i]]) {
               curDepth[parents[i]] = {};
            }
            curDepth = curDepth[parents[i]];
         }
         curDepth[test.title] = err.message;
      });
   };

   window.getTestStatus = function getTestStatus() {
      return status;   
   };
})();
