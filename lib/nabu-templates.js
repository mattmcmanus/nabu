/*
 * nabu-templates
 * https://github.com/mattmcmanus/nabu-cli
 *
 * Copyright (c) 2013 Matt McManus
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');

exports.processFiles = function(nabu, callback) {
  var templates = nabu.utils.findFiles(nabu.files, function(file){ 
    return (path.extname(file) === '.'+nabu.site.template_engine); 
  });

  // Update file list
  nabu.files = nabu.utils.removePaths(nabu.files, templates);

  // Add assets to site
  nabu.site.templates = templates;
  
  callback(null, nabu);
};