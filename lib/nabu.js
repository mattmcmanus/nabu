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
    winston = require('winston');


module.exports = nabu;

// Expose the constructor for potential inheritance
nabu.Nabu = Nabu;

function nabu (options) {
  return new Nabu(options);
}

// Stubs for loaded plugins
var plugins = [];
var render;

function Nabu (options) {
  var _files = [],
      files = require('./files.js'),
      site = {};

  var defaults = require(path.join(__dirname, '../_defaults.json')), // Load _defaults.json
      configPath = path.join(process.cwd(),'./_config.json'), // Get the full path to the current themes _config.json
      config = (fs.existsSync(configPath)) ? require(configPath) : {};

  site = _.extend(site, defaults, config, options);

  log.transports.console.level = site.loggingLevel;
  console.log(this);
  //this.loadPlugins();
}

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
  console.log(this);
  // require all the plugins
  this.site.plugins.forEach(function(plugin, index){
    plugins.push(require('Nabu-'+plugin));
  });

  // markdown parser
  this.md = require(this.site.markdown);
  this.md.setOptions(this.site[this.site.markdown]);
  
  // Nabu-render-*
  render = require('Nabu-render-' + this.site.render);
};

/**
 * Load all of the files in a sites directory
 */
Nabu.prototype.loadFiles = function() {
  var files = _.union(glob.sync('./*.*'), glob.sync('./!(node_modules|_site)/**/*.*'));
  
  // Remove some
  this._files = this.files.removeAnyContaining(files, this.site.ignore);
};


/**
 * process a markdown file
 * 
 * @param  {Object}   file     
 * @param  {Function} callback 
 */
Nabu.prototype.parseMarkdownFile = function(file, callback) {
  fs.readFile(file.sourcePath, 'utf8', function(err, data){
    if (err) { throw err; }
    // Bring in markdown frontmatter into existing file object
    file = _.extend(file, yamlfm.loadFront(data, 'content_raw'));
    // Render the markdown content
    file.content = this.md(file.content_raw);

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

Nabu.prototype.parseFiles = function(callback) {
  log.info('Parsing loaded files');
  log.profile('Parsing');
  // Create the list of steps that will need to be gone through
  var self = this,
      steps = [];

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
  self.loadFiles();

  async.series([
    async.apply(self.parseFiles),
    async.apply(self.renderFiles),
  ],
  function(err, results) {
    log.profile('Site generation');
    //var code = _.reduce(results, function(memo, num){ return memo + num; }, 0);
    finish(err, 0);
  });
};