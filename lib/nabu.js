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

// Only plugin methods to allow
var validPluginMethods = ['processFiles', 'modifyContent', 'templateHelpers', 'renderFile'];

// Nabu!
var nabu = {
  files: {},
  plugins: {},
  hooks: [],
  site: {},
  utils: require('./utils.js')
};

// Prep nabu object with valid plugin hooks
validPluginMethods.forEach(function(hook){
  nabu.hooks[hook] = [];
});


//      Nabu
// -----------------------------------------------

nabu.bootstrap = function(source) {
  // Configuration!
  var defaults = require('../_defaults.json');
  
  if (source) {
    process.chdir(path.relative(process.cwd(),source));
  }

  var configPath = path.join(process.cwd(),'./_config.json');
  var config = (fs.existsSync(configPath)) ? require(configPath) : {};
  nabu.site = _.extend(nabu.site, defaults, config);
  
  // Add the default plugins to the front of the list
  nabu.site.plugins.unshift('layouts', 'templates', 'assets');

  // Get a sense of the propsed plugins
  nabu.site.plugins.forEach(function(plugin){
    // Figure out if it's a local module or an npm installed module
    // Kinda feels gross. There should be a better way to do this
    var pluginString = path.join(__dirname,'nabu-'+plugin+'.js');
    var pluginPath = (fs.existsSync(pluginString)) ? pluginString : 'nabu-'+plugin;
    nabu.plugins[plugin] = require(pluginPath);

    var methods = _.functions(nabu.plugins[plugin]);
    validPluginMethods.forEach(function(method){
      if (methods.indexOf(method) !== -1) {
        nabu.hooks[method].push(plugin); 
      }
    });
  });

  // Dynamically loaded modules
  // markdown parser
  nabu.md = require(nabu.site.markdown);
  nabu.md.setOptions(nabu.site[nabu.site.markdown]);
  // templates
  nabu.render = consolidate[nabu.site.template_engine];

  return nabu;
};

/**
 * return the nabu object. Used for testing. Am i doing this wrong?
 */
nabu.returnSelf = function() {
  return this;
};

/**
 * loadFiles
 */
nabu.loadFiles = function() {
  var files = _.union(glob.sync('./*.*'), glob.sync('./!(node_modules|_site)/**/*.*'));
  
  nabu.files = nabu.utils.arrayRemoveAnyContaining(files, ['_config.json', 'package.json']);

  return files;
};


/**
 * process a markdown file
 * 
 * @param  {Object}   file     
 * @param  {Function} callback 
 */
nabu.processMarkdownFile = function(file, callback) {
  fs.readFile(file.sourcePath, 'utf8', function(err, data){
    if (err) { throw err; }
    // Bring in markdown frontmatter into existing file object
    file = _.extend(file, yamlfm.loadFront(data, 'content_raw'));
    // Render the markdown content
    file.content = nabu.md(file.content_raw);

    // Make sure the layout file specified in the front matter exists
    if (!nabu.site.layouts[file.layout]) {
      throw new Error('There is now layout file by the name of ' + file.layout + ' specified in ' + file.sourcePath);
    }

    callback(err, file);
  });
};

/**
 * Process the file at given sourcePath and structure its meta data
 *
 * @param  {String} sourcePath path to file found by globing
 */
nabu.processFile = function(sourcePath, callback) {
  var file = {};

  file.sourcePath = sourcePath;

  file.permalink = sourcePath.substring(0, sourcePath.lastIndexOf('.'));
  // If the file is an index.html file, don't get too fancy
  if (path.basename(file.permalink) === 'index.html') {
    file.permalink = path.dirname(file.permalink);
  }
  // If there is no extension, add /index.html to the end
  // path = about -> about/index.html
  if (!path.extname(file.permalink)) {
    file.permalink = path.join(file.permalink, 'index.html');
  }

  file.targetPath = nabu.utils.targetPath(nabu, file.permalink);

  callback(null, file);
};

nabu.processFileType = function(type, callback) {
  nabu.plugins[type].processFiles(nabu, callback);
};

nabu.processFiles = function(callback) {
  // Loop through all the processFile hooks setup in the bootstrapping
  async.map(nabu.hooks.processFiles, nabu.processFileType, function(err, results){
    if (err) { console.log(err); }

    // Move any left over files to assets
    nabu.files.forEach(function(file){
      nabu.site.assets.push(file);
    });
    delete nabu.files;

    callback(err);
  });
};

/**
 * Render all the files!
 *
 * @param  {Object}   post     The object for an individual post
 * @param  {Function} callback the callback
 */
nabu.renderFile = function(file, options, callback) {
  options.page = file;
  options.site = nabu.site;
  options.filename = file.layout;

  mkdirp.sync(path.dirname(file.targetPath));

  file.layoutPath = (nabu.site.layouts.indexOf(file.layout)) ? nabu.site.layouts[file.layout] : file.sourcePath;

  nabu.render(file.layoutPath, options, function(err, html) {
    if (err) { console.log(err); throw err; }
    fs.writeFile(file.targetPath, html, callback);
  });
};

nabu.renderContent = function(file, callback) {
  var options = {
    title: file.title,
    content: file.content
  };

  nabu.renderFile(file, options, callback);
};

nabu.renderTemplate = function(file, callback) {
  // Nothing to do here. Yet!
  nabu.renderFile(file, {}, callback);
};

/**
 * Render all the things!
 */
nabu.renderSite = function() {
  async.map(nabu.hooks.renderFile, nabu.processFileType, function(err, results){
    if (err) { console.log(err); }
    callback(err);
  });
};

nabu.processFileType = function(type, callback) {
  nabu.plugins[type].processFiles(nabu, callback);
};

nabu.processFiles = function(callback) {
  // Loop through all the processFile hooks setup in the bootstrapping
  async.map(nabu.hooks.processFiles, nabu.processFileType, function(err, results){
    if (err) { console.log(err); }
    callback(err);
  });
};


/**
 * Copy over all static assets to destination folder
 */
nabu.copyAssets = function() {
  this.site.assets.forEach(function(file) {
    var target = nabu.utils.targetPath(nabu, file);
    mkdirp.sync(path.dirname(target));
    fs.createReadStream(file).pipe(fs.createWriteStream(target));
  });
};

/**
 * Generate the site
 *
 * @param  {[type]} source Optional param to provide arbitrary source
 */
nabu.generate = function(source) {
  this.bootstrap(source);
  rimraf.sync(nabu.site.destination);
  this.loadFiles();
  this.processFiles();
  this.renderSite();
  this.copyAssets();
};

module.exports = nabu;
