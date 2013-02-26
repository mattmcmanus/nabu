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

// Remove items from an array that have any bit of the passed in patterns
exports.arrayRemoveAnyContaining = function(array, patterns) {
  // If only a string is passed, convert it to an array
  if (!Array.isArray(patterns)){
    patterns = [patterns];
  }
  var remains = [];
  // Loop through each pattern and make a list of remaining files
  patterns.forEach(function(pattern){
    remains.push(_.reject(array, function(item){ 
      return (item.indexOf(pattern) !== -1);
    }));
  });
  // Find the intersection of all the remaining files
  remains = _.intersection.apply(undefined, remains);

  return remains;
};

exports.findFiles = function(files, iterator, context){
  var results = [];
  files.forEach(function(file, index){
    if (iterator.call(context, file, index)) {
      results.push(file);
    }
  });
  return results;
};

exports.findFilesInFolder = function(files, contentFolder){
  return this.findFiles(files, function(file){ 
    return (file.indexOf(contentFolder) !== -1); 
  });
};

// Once a plugin detirmines it's files. Make it easy for it
// to remove those files from the file list
exports.removePaths = function(files, paths){
  return _.difference(files, paths);
};