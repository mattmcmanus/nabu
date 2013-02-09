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
  config: {},
  files: {},
  site: {
    posts: [],
    pages: [],
    templates: []
  }
};

// 1. Get a list of all the files
// 2. Detirmine content (md), templates, and static assets
// 3. process posts and pages - extract meta data, etc
// 4. Render pages - put in same relative location
// 5. Render posts - permalinks
// 6. Copy assets
nabu.bootstrap = function(source){
  // Configuration!
  var defaults = require('../_defaults.json');
  
  if (source){
    process.chdir(path.relative(process.cwd(),source));
  }

  var configPath = './_config.json';

  nabu.config = (fs.existsSync(configPath)) ? _.extend(defaults, require(configPath)) : defaults;

  // Dynamically loaded modules
  // markdown parser
  nabu.md = require(nabu.config.markdown);
  nabu.md.setOptions(nabu.config[nabu.config.markdown]);
  // templates
  nabu.render = consolidate[nabu.config.template_engine];
};

function isTemplateFile(file) {
  return (path.extname(file) === '.'+nabu.config.template_engine);
}

/**
 * process the file at given filePath and structure it's meta data
 *
 * @param  {String} filePath path to file found by globing
 */
nabu.processContent = function(filePath, type) {
  var rawFile = fs.readFileSync(filePath, 'utf8');
  var file = yamlfm.loadFront(rawFile, 'content_raw');

  file.filePath = filePath;

  file.content = nabu.md(file.content_raw);

  if (file.date) {
    file.date = moment(file.date);
  }

  file.slug = _.slugify(file.title);

  if (type === 'posts'){
    //TODO: Actually obey permalink setting
    file.permalink = file.slug + '/';  
  } else {
    // Return original filepath without extension. (ie: ./about.md -> ./about)
    file.permalink = filePath.substring(0, filePath.lastIndexOf('.'));
    // If the file is an index.html file, don't get too fancy
    if (path.basename(file.permalink) === 'index.html') {
      file.permalink = path.dirname(file.permalink);
    }
  }
  
  file.targetPath = path.join(process.cwd(), nabu.config.destination, file.permalink, "index.html");

  return file;
};
// FInish setting up this function. Does it even need to be seperate?
nabu.processTemplate = function(filePath){
  var file = {};
  file.filePath = filePath;
  file.permalink = filePath.substring(0, filePath.lastIndexOf('.'));
  // This should be it's own function
  file.targetPath = path.join(process.cwd(), nabu.config.destination, file.permalink, "index.html");

  return file;
};

nabu.processFiles = function() {
  ['pages', 'posts'].forEach(function(type){
    nabu.files[type].forEach(function(file){
      nabu.site[type].push(nabu.processContent(file, type));
    });
  });
  nabu.files.templates.forEach(function(file){
    nabu.site.templates.push(nabu.processTemplate(file));
  });
};

/**
 * loadPosts
 * 
 * @return {[type]} [description]
 */
nabu.loadFiles = function() {
  var files = glob.sync('./**/*.*');
  ['posts', 'layouts', 'includes', 'templates', 'pages', 'assets'].forEach(function(folder){
    nabu.files[folder] = files.filter(function(file, index){
      // Quick and dirty file/folder ignoring. Need to build this out
      if (file.indexOf('_site') !== -1 || file.indexOf('_config') !== -1) {
        delete files[index];
        return;
      }
      // Is the file in any of the above folders?
      if (file.indexOf('_'+folder) !== -1) {
        delete files[index];
        return true;
      }
      // Is 
      if (folder === 'templates' && isTemplateFile(file)) {
        delete files[index];
        return true;
      }
      // Are we in the assets loop and are any of the files non-text?
      if (folder === 'assets' && mime.lookup(file).split('/')[0] !== 'text') {
        delete files[index];
        return true;
      }
      // Are we in the pages loop and do any remaining files have YAML front matter?
      if (folder === 'pages' && yamlfm.loadFront(fs.readFileSync(file))) {
        delete files[index];
        return true;
      }
      // Assume everything left is a static asset
      if (folder === 'assets'){
        delete files[index];
        return true;
      }
    });
  });
  // Name each layout: 
  // Example: 
  //    ./_layouts/default.jade -> {'default':./_layouts/default.jade}
  var layouts = {};
  nabu.files.layouts.forEach(function(layout){
    layouts[path.basename(layout.split('.')[1])] = layout;
  });
  nabu.files.layouts = layouts;
  
  return nabu.files;
};

/**
 * Render all the files!
 *
 * @param  {Object}   post     The object for an individual post
 * @param  {Function} callback the callback
 */
nabu.renderFile = function(file, callback){
  mkdirp.sync(path.dirname(file.targetPath));

  var options = {
    page: file,
    pages: nabu.site.pages,
    posts: nabu.site.posts
  };

  var layout = '';
  // This is starting to get messy. Consider possible ways to streamline
  if (isTemplateFile(file.filePath)) {
    layout = file.filePath;
  } else {
    options.title = file.title,
    options.content = file.content,
    layout = nabu.files.layouts[file.layout];
  }
  options.filename = layout;

  nabu.render(layout, options, function(err, html){
    if (err) { console.log(err); throw err; }
    fs.writeFile(file.targetPath, html, callback);
  });
};

/**
 * Render all the things!
 */
nabu.renderSite = function(){
  ['posts', 'pages', 'templates'].forEach(function(folder){
    async.forEach(nabu.site[folder], nabu.renderFile, function(err){
      if (err) { throw err; }
    });
  });
};

/**
 * copy over all static assets to destination folder
 */
nabu.copyAssets = function(){
  this.files.assets.forEach(function(file){
    var target = path.join(process.cwd(), nabu.config.destination, file);
    mkdirp.sync(path.dirname(target));
    fs.createReadStream(file).pipe(fs.createWriteStream(target));
  });
};

/**
 * Generate the site
 *
 * @param  {[type]} source Optional param to provide arbitrary source
 */
nabu.generate = function(source){
  this.bootstrap(source);
  this.loadFiles();
  this.processFiles();
  this.renderSite();
  this.copyAssets();
};

module.exports = nabu;
