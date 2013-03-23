/*
 * nabu
 * https://github.com/mattmcmanus/nabu
 *
 * Copyright (c) 2013 Matt McManus
 * Licensed under the MIT license.
 */

'use strict';

/**
 * Module dependencies.
 */

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    _ = require('underscore'),
    async = require('async'),
    glob = require('glob'),
    yamlfm = require('yaml-front-matter'),
    winston = require('winston');

// Nabu!
var nabu = {};
nabu._files = [];
nabu.files = require('./files.js');
nabu.site = {};

var plugins = [];
var render;
var log = nabu.log = new winston.Logger({
  transports: [
    new winston.transports.Console({
      //handleExceptions: true
    })
  ],
  //exitOnError: false
});
log.cli();

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
 * [bootstrap description]
 * @param  {[type]} source [description]
 */
nabu.bootstrap = function() {
  this.loadConfig(); // Load all config files in nabu.site

  log.transports.console.level = this.site.loggingLevel;

  // require all the plugins
  this.site.plugins.forEach(function(plugin, index){
    plugins.push(require('nabu-'+plugin));
  });

  // markdown parser
  this.md = require(nabu.site.markdown);
  this.md.setOptions(nabu.site[nabu.site.markdown]);
  
  // nabu-render-*
  render = require('nabu-render-' + this.site.render);
};

/**
 * Load all of the files in a sites directory
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
nabu.parseMarkdownFile = function(file, callback) {
  fs.readFile(file.sourcePath, 'utf8', function(err, data){
    if (err) { throw err; }
    // Bring in markdown frontmatter into existing file object
    file = _.extend(file, yamlfm.loadFront(data, 'content_raw'));
    // Render the markdown content
    file.content = nabu.md(file.content_raw);

    callback(err, file);
  });
};

/**
 * Process the file at given sourcePath and structure its meta data
 *
 * @param  {String} sourcePath path to file found by globing
 */
nabu.parse = function(sourcePath, callback) {
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

  file.targetPath = nabu.files.targetPath(nabu, file.permalink);

  // Markdown parsing
  if (['.md', '.markdown'].indexOf(path.extname(sourcePath)) !== -1) {
    nabu.parseMarkdownFile(file, function(err, file){
      callback(err, file);
    });
  }
};

nabu.parseFiles = function(callback) {
  log.info('Parsing loaded files');
  log.profile('Parsing');
  // Create the list of steps that will need to be gone through
  var steps = [];

  plugins.forEach(function(plugin, index){
    // This is attrocious but I'm not sure about the proper syntax to not make this ugly
    // The first step needs to pass in the nabu object thats been bootstrapped
    // The rest of the steps need to accept the modified nabu object
    if (index === 0) {
      steps.push(function(next) {
        plugin(nabu, next);
      });
    } else {
      steps.push(function(nabu, next) {
        plugin(nabu, next);
      });
    }
  });
  
  async.waterfall(steps, function(err, results) {
    log.profile('Parsing');
    callback(err, results);
  });
};

/**
 * Call the nabu-render plugin
 */
nabu.renderFiles = function(callback){
  log.info('Summoning the render plugin');
  log.profile('Rendering');
  
  render(nabu, function(err, results){
    log.profile('Rendering');
    callback(err, results);
  });
};

/**
 * Generate the site
 *
 * @param  {[type]} source Optional param to provide arbitrary source
 */
nabu.generate = function(finish) {
  log.profile('Site generation');

  this.bootstrap();
  this.loadFiles();

  async.series([
    async.apply(nabu.parseFiles),
    async.apply(nabu.renderFiles),
  ],
  function(err, results) {
    log.profile('Site generation');
    //var code = _.reduce(results, function(memo, num){ return memo + num; }, 0);
    finish(err, 0);
  });
};

module.exports = nabu;