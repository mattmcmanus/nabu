'use strict';

var nabu = require('../lib/nabu.js'),
    // fs = require('fs'),
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

// exports['loadFiles'] = {
//   setUp: function(done) {
//     // setup here
//     done();
//   },
//   'no args': function(test) {
//     test.expect(1);
//     // tests here
//     nabu.loadFiles('/Users/matt/www/nabu-site/**/*.markdown');

//     test.ok(site,'should be awesome.');
//     test.done();
//   },
// };

exports['processFile'] = {
  'process a post': function(test) {
    test.expect(3);
    // tests here
    var post = nabu.processFile(path.resolve('./test/fixtures/sample.md'));

    test.ok(post,'Post should be truthy');
    test.equal(post.title, 'Sampled');
    test.ok(post.content.match(/<h2>Santas<\/h2>/));

    test.done();
  },
};


// exports['renderSite'] = {
//   setUp: function(done){
//     rimraf('./_site', function(err){
//       if (err) {throw err;}
//       done();
//     });
//   },
//   'no args': function(test) {
//     test.expect(1);
//     // tests here
//     nabu.renderSite();
//     test.ok(fs.existsSync('./_site'), "Does not throw a fatal error");
//     test.done();
//   },
// };
