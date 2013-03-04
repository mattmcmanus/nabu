'use strict';

var path = require('path'),
    _ = require('underscore');

exports.targetPath = function(nabu, target) {
  return path.join(process.cwd(), nabu.site.destination, target);
};

// Array Remove - By John Resig (MIT Licensed)
// http://ejohn.org/blog/javascript-array-remove/
exports.arrayRemove = function(array, from, to) {
  var rest = array.slice((to || from) + 1 || array.length);
  array.length = from < 0 ? array.length + from : from;
  return array.push.apply(array, rest);
};
