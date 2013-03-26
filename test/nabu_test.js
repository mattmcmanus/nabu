'use strict';

var fs = require('fs'),
    path = require('path');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

// var site = {};

process.chdir('./test/fixtures');

var nabu = require('../lib/nabu.js');
var generator;

exports['nabu'] = {
  setUp: function(done) {
    generator = nabu();
    done();
  },

  'loadFiles()': function(test) {
    test.expect(2);
    
    generator.loadFiles();
    // console.log(generator._files);
    test.ok((generator._files.length > 1));
    test.ok((generator._files.indexOf('./_config.json') === -1), 'It should ignore the config file');
    test.done();
  },

  'parseFiles()': function(test) {
    test.expect(3);
    generator.loadFiles();
    generator.parseFiles(function(err, results){
      // console.log(generator);
      test.ok(generator, 'There shold be a nabu object');
      test.equal(err, null, 'err should be null');
      test.equal(generator.site.assets.length, 2, 'There should be at least 1 asset');
      test.done();
    });
  },

  tearDown: function(done) {
    generator = null;
    done();
  }
};


// var generator2;

// exports['commands'] = {
//   setUp: function(done) {
//     generator2 = nabu();
//     done();
//   },
//   'generate()': function(test) {
//     test.expect(2);
//     generator2.generate(function(err, result){
//       test.equal(err, null, 'There should be no returned errors');
//       test.equal(result, 0, 'The result of generate should be an exit code of 0');
//       test.done();
//     });
//   },

//   tearDown: function(done) {
//     generator2 = null;
//     done();
//   }
// };