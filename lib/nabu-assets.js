/*
 * nabu-assets
 * https://github.com/mattmcmanus/nabu
 *
 * Copyright (c) 2013 Matt McManus
 * Licensed under the MIT license.
 */

'use strict';

var mime = require('mime');

exports.processFiles = function(nabu, callback) {
  var assets = nabu.utils.findFiles(nabu.files, function(file){
    return (mime.lookup(file).split('/')[0] !== 'text'); 
  });
  
  // Update file list
  nabu.files = nabu.utils.removePaths(nabu.files, assets);
  
  // Add assets to site
  nabu.site.assets = assets;
  
  callback(null, nabu);
};