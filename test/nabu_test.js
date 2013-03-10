'use strict';

var nabu = require('../lib/nabu.js'),
    fs = require('fs'),
    rimraf = require('rimraf'),
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

exports['nabu'] = {
  setUp: function(done) {
    done();
  },
  'bootstrap': function(test) {
    test.expect(2);
    // tests here
    nabu.bootstrap('./test/fixtures');

    test.ok(nabu,'There should be a nabu object');
    test.equal(nabu.site.destination, './_site', 'Destination dir should be _site');

    test.done();
  },
  'loadFiles': function(test) {
    test.expect(2);
    
    nabu.loadFiles();
    test.ok((nabu._files.length > 1));
    test.ok((nabu._files.indexOf('./_config.json') === -1), "It should ignore the config file");
    test.done();
  },
  'parseFiles': function(test) {
    test.expect(2);
    
    nabu.parseFiles(function(err){
      test.ok(nabu, "There shold be a nabu object");
      test.ok(nabu.site.assets, "There shold be at least 1 page");
      test.done();
    });
    
  },
  // 'generate': function(test) {
  //   test.expect(3);
  //   // tests here
  //   nabu.generate();
  //   test.ok(fs.existsSync('_site'), "_site dir exists");
  //   test.ok(fs.existsSync('_site/index.html'), "The homepage exists");
  //   test.ok(fs.existsSync('_site/images/anchor-porter.jpg'), "The image exists");
  //   test.done();
  // },
  tearDown: function(done) {
    rimraf('_site', done);
  }
};