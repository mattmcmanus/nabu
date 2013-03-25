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

// var nabu;

// exports['nabu'] = {
//   setUp: function(done) {
//     nabu = require('../lib/nabu.js');
//     done();
//   },

//   'bootstrap()': function(test) {
//     test.expect(2);
//     // tests here
//     nabu.bootstrap();

//     test.ok(nabu,'There should be a nabu object');
//     test.equal(nabu.site.destination, './_site', 'Destination dir should be _site');

//     test.done();
//   },

//   'loadFiles()': function(test) {
//     test.expect(2);
    
//     nabu.loadFiles();
//     test.ok((nabu._files.length > 1));
//     test.ok((nabu._files.indexOf('./_config.json') === -1), 'It should ignore the config file');
//     test.done();
//   },

//   'parseFiles()': function(test) {
//     test.expect(2);
    
//     nabu.parseFiles(function(err){
//       test.ok(nabu, 'There shold be a nabu object');
//       test.ok(nabu.site.assets, 'There should be at least 1 asset');
//       test.done();
//     });
//   },

//   tearDown: function(done) {
//     nabu = null;
//     done()
//   }
// };


var nabu2, generator;

exports['commands'] = {
  setUp: function(done) {
    nabu2 = require('../lib/nabu.js');
    generator = nabu2();
    console.log(generator);
    done();
  },
  'generate()': function(test) {
    test.expect(2);
    generator.generate(function(err, result){
      test.equal(err, null, 'There should be no returned errors');
      test.equal(result, 0, 'The result of generate should be an exit code of 0');
      test.done();
    });
  },

  tearDown: function(done) {
    nabu2 = null;
    done();
  }
};