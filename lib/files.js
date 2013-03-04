'use strict';

var _ = require('underscore');

var files = {
  find: function(files, iterator, context){
    var results = [];
    files.forEach(function(file, index){
      if (iterator.call(context, file, index)) {
        results.push(file);
      }
    });
    return results;
  },

  findInFolder: function(files, contentFolder){
    return this.find(files, function(file){ 
      return (file.indexOf(contentFolder) !== -1); 
    });
  },

  // Remove items from an array that have any bit of the passed in patterns
  removeAnyContaining: function(array, patterns) {
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
  },

  // Once a plugin detirmines it's files. Make it easy for it
  // to remove those files from the file list
  removePaths: function(files, paths){
    return _.difference(files, paths);
  }
};

module.exports = files;