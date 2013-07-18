/*
 * Nabu
 * https://github.com/mattmcmanus/Nabu
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
    moment = require('moment'),
    winston = require('winston');
    _.str = require('underscore.string');
    _.mixin(_.str.exports());


module.exports = nabu;

// Expose the constructor for potential inheritance
nabu.Nabu = Nabu;

function nabu (options) {
  return new Nabu(options);
}

// Stubs for loaded plugins
var plugins = [];
var render = require('./render.js');

function Nabu (options) {
  this._files = [];
  this.files = require('./files.js');
  this.site = {
    helpers: {}
  };

  // [{
  //    "layout":"./index.html.jade",
  //    ""
  //      
  // }]
  this.templates = [];

  var defaults = require(path.join(__dirname, '../_defaults.json')), // Load _defaults.json
      configPath = path.join(process.cwd(),'./_config.json'), // Get the full path to the current themes _config.json
      config = (fs.existsSync(configPath)) ? require(configPath) : {};

  this.site = _.extend(this.site, defaults, config, options);

  this.log.transports.console.level = this.site.loggingLevel;

  this.loadPlugins();
}


/**
 * [log description]
 * @type {[type]}
 */
var log = Nabu.prototype.log = new winston.Logger({
  transports: [
    new winston.transports.Console({
      //handleExceptions: true
    })
  ],
  //exitOnError: false
});
log.cli();


/**
 * [bootstrap description]
 * @param  {[type]} source [description]
 */

Nabu.prototype.loadPlugins = function() {
  // require all the plugins
  this.site.plugins.forEach(function(plugin, index){
    plugins.push(require('nabu-'+plugin));
  });

  // markdown parser
  this.md = require(this.site.markdown);
  this.md.setOptions(this.site[this.site.markdown]);
};


/**
 * Load all of the files in a sites directory
 *
 * TODO: This is terrible. Clean it up. 
 */

Nabu.prototype.loadFiles = function(callback) {
  var files = _.union(glob.sync('./*.*'), glob.sync('./!(node_modules|_site)/**/*.*'));
  
  // Remove any files that were picked up that should be ignored
  this._files = this.files.removeAnyContaining(files, this.site.ignore);

  callback();
};


/**
 * Permalinking
 *
 * This feels uncomfortable here. Struggling to figure out the best way to scope this
 */

Nabu.prototype.permalink = function(post){
  _.templateSettings = {
    interpolate : /\:(.+?)\:/g
  };
  var permalink = _.tempalte(this.permalink[post.layout], post);
  console.log(permalink);
  permalink = _.slugify(permalink);
  console.log(permalink);
  return permalink;
};


/**
 * process a markdown file
 * 
 * @param  {Object}   file     
 * @param  {Function} callback 
 */

Nabu.prototype.parseMarkdownFile = function(file, callback) {
  var self = this;

  fs.readFile(file.sourcePath, 'utf8', function(err, data){
    if (err) { throw err; }
    // Bring in markdown frontmatter into existing file object
    file = _.extend(file, yamlfm.loadFront(data, 'content_raw'));
    // Render the markdown content
    file.content = self.md(file.content_raw);

    callback(err, file);
  });
};


/**
 * Process the file at given sourcePath and structure its meta data
 *
 * @param  {String} sourcePath path to file found by globing
 */

Nabu.prototype.parse = function(sourcePath, callback) {
  //var self = this;
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

  file.targetPath = this.files.targetPath(this, file.permalink);

  // Markdown parsing
  if (['.md', '.markdown'].indexOf(path.extname(sourcePath)) !== -1) {
    this.parseMarkdownFile(file, function(err, file){
      callback(err, file);
    });
  }
};


/**
 * Parse all the files!
 * 
 * @param  {Function} callback [description]
 */

Nabu.prototype.parseFiles = function(callback) {
  log.info('Parsing loaded files');
  log.profile('Parsing');
  // Create the list of steps that will need to be gone through
  var self = this;
  var steps = [];

  plugins.forEach(function(plugin, index){
    // This is attrocious but I'm not sure about the proper syntax to not make this ugly
    // The first step needs to pass in the Nabu object thats been bootstrapped
    // The rest of the steps need to accept the modified Nabu object
    if (index === 0) {
      steps.push(function(next) {
        plugin(self, next);
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
 * Call the Nabu-render plugin
 */

Nabu.prototype.renderFiles = function(callback){
  log.info('Summoning the render plugin');
  log.profile('Rendering');
  
  var self = this;

  render(self, function(err, results){
    log.profile('Rendering');
    callback(err, results);
  });
};


/**
 * Generate the site
 *
 * @param  {[type]} source Optional param to provide arbitrary source
 */

Nabu.prototype.generate = function(finish) {
  log.profile('Site generation');
  var self = this;

  async.series([
    function(next){ self.loadFiles(next); },
    function(next){ self.parseFiles(next); },
    function(next){ self.renderFiles(next); }
  ],
  function(err, results) {
    log.profile('Site generation');
    //TODO: Actually figure out a proper exit code
    finish(err, 0);
  });
};