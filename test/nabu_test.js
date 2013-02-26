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
    test.expect(1);
    // tests here
    nabu.bootstrap('./test/fixtures');
    var nabuData = nabu.returnSelf();

    test.ok(nabuData,'There should be a nabu object');

    test.done();
  },
  'loadFiles': function(test) {
    test.expect(2);
    
    var files = nabu.loadFiles();
    test.ok((files.length > 1));
    test.ok((files.indexOf('_config.json') === -1), "It should ignore the config file");
    test.done();
  },
  'processFiles': function(test) {
    test.expect(2);
    
    nabu.processFiles(function(err){
      var nabuData = nabu.returnSelf();
      test.ok(nabuData, "There shold be a nabu object");
      test.ok((nabuData.site.pages.length > 0), "There shold be at least 1 page");
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