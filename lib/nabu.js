/*
 * nabu
 * https://github.com/mattmcmanus/nabu
 *
 * Copyright (c) 2013 Matt McManus
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    _ = require('underscore'),
    moment = require('moment'),
    async = require('async'),
    glob = require('glob'),
    yamlfm = require('yaml-front-matter'),
    mime = require('mime'),
    consolidate = require('consolidate');
    _.str = require('underscore.string');
    _.mixin(_.str.exports());

// Nabu!
var nabu = {
  _files: {},
  files: require('./files.js'),
  utils: require('./utils.js'),
  pluginTypes: {
    process: [],
    commmand: []
  },
  site: {}
};

var plugins = [];

//      Nabu
// -----------------------------------------------

nabu.bootstrap = function(source) {
  
  if (source) {
    process.chdir(path.relative(process.cwd(),source));
  }

  this.loadConfig();

  // Get a sense of the propsed plugins
  this.site.plugins.forEach(function(plugin, index){
    plugins[plugin] = require('nabu-'+plugin);

    _.keys(nabu.pluginTypes).forEach(function(method){
      if (_.functions(plugins[plugin]).indexOf(method) !== -1) {
        nabu.pluginTypes[method].push(plugin); 
      }
    });
  });

  // Dynamically loaded modules
  // markdown parser
  this.md = require(nabu.site.markdown);
  this.md.setOptions(nabu.site[nabu.site.markdown]);
  
  // templates
  this.render = consolidate[nabu.site.template_engine];

  return nabu;
};

/**
 * Load all the configuration files!
 */
nabu.loadConfig = function(nabu) {
  var defaults = require(path.join(__dirname, '../_defaults.json')), // Load _defaults.json
      configPath = path.join(process.cwd(),'./_config.json'), // Get the full path to the current themes _config.json
      config = (fs.existsSync(configPath)) ? require(configPath) : {}; // Smush all that into nabu.site

  this.site = _.extend(this.site, defaults, config);
};

/**
 * loadFiles
 */
nabu.loadFiles = function() {
  var files = _.union(glob.sync('./*.*'), glob.sync('./!(node_modules|_site)/**/*.*'));
  
  // Remove some
  this._files = nabu.files.removeAnyContaining(files, this.site.ignore);
};


/**
 * process a markdown file
 * 
 * @param  {Object}   file     
 * @param  {Function} callback 
 */
// nabu.processMarkdownFile = function(file, callback) {
//   fs.readFile(file.sourcePath, 'utf8', function(err, data){
//     if (err) { throw err; }
//     // Bring in markdown frontmatter into existing file object
//     file = _.extend(file, yamlfm.loadFront(data, 'content_raw'));
//     // Render the markdown content
//     file.content = nabu.md(file.content_raw);

//     // Make sure the layout file specified in the front matter exists
//     if (!nabu.site.layouts[file.layout]) {
//       throw new Error('There is now layout file by the name of ' + file.layout + ' specified in ' + file.sourcePath);
//     }

//     callback(err, file);
//   });
// };

/**
 * Process the file at given sourcePath and structure its meta data
 *
 * @param  {String} sourcePath path to file found by globing
 */
// nabu.process = function(sourcePath, callback) {
//   var file = {};

//   file.sourcePath = sourcePath;

//   file.permalink = sourcePath.substring(0, sourcePath.lastIndexOf('.'));
//   // If the file is an index.html file, don't get too fancy
//   if (path.basename(file.permalink) === 'index.html') {
//     file.permalink = path.dirname(file.permalink);
//   }
//   // If there is no extension, add /index.html to the end
//   // path = about -> about/index.html
//   if (!path.extname(file.permalink)) {
//     file.permalink = path.join(file.permalink, 'index.html');
//   }

//   file.targetPath = nabu.utils.targetPath(nabu, file.permalink);

//   callback(null, file);
// };

nabu.processFiles = function(callback) {
  // Create the list of steps that will need to be gone through
  var steps = [];
  nabu.pluginTypes.process.forEach(function(plugin, index){
    // This is attrocious but I'm not sure about the proper syntax to not make this ugly
    if (index === 0) {
      steps.push(function(callback) {
        plugins[plugin].process(nabu, callback);
      });
    } else {
      steps.push(function(nabu, callback) {
        plugins[plugin].process(nabu, callback);
      });
    }
  });
  
  async.waterfall(steps, function(err, results) {
    callback(err, results);
  });
};

/**
 * Generate the site
 *
 * @param  {[type]} source Optional param to provide arbitrary source
 */
nabu.generate = function(source) {
  this.bootstrap(source);
  // rimraf.sync(nabu.site.destination);
  this.loadFiles();
  this.processFiles();
  this.renderSite();
  this.copyAssets();
};

module.exports = nabu;
