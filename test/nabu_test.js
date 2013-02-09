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

exports['loadFiles'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(4);
    // tests here
    nabu.bootstrap('test/fixtures');
    var files = nabu.loadFiles();
    test.equal(files.posts.length, 2);
    test.equal(files.assets.length, 2);
    test.equal(files.pages.length, 1);
    test.equal(files.templates.length, 1);
    test.done();
  },
};

exports['processContent'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'process a post': function(test) {
    test.expect(3);
    // tests here
    var post = nabu.processContent(path.resolve('./sample.md'));

    test.ok(post,'Post should be truthy');
    test.equal(post.title, 'Sampled');
    test.ok(post.content.match(/<h2>Santas<\/h2>/));

    test.done();
  },
};


exports['generate'] = {
  setUp: function(done){
    rimraf.sync('_site');
    done();
  },
  'no args': function(test) {
    test.expect(3);
    // tests here
    nabu.generate();
    test.ok(fs.existsSync('_site'), "_site dir exists");
    test.ok(fs.existsSync('_site/index.html'), "The homepage exists");
    test.ok(fs.existsSync('_site/images/anchor-porter.jpg'), "The image exists");
    test.done();
  },
};
