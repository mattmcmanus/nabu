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
  files: {},
  site: {
    posts: [],
    pages: [],
    templates: []
  }
};


//      Utility Functions
// - - - - - - - - - - - - - - - - - - - - -

function targetPath(target) {
  return path.join(process.cwd(), nabu.site.destination, target);
}



//      Nabu
// -----------------------------------------------

nabu.bootstrap = function(source) {
  // Configuration!
  var defaults = require('../_defaults.json');
  
  if (source) {
    process.chdir(path.relative(process.cwd(),source));
  }

  var configPath = process.cwd()+'/_config.json';

  var buildSite = ['nabu.site', 'defaults'];
  if (fs.existsSync(configPath)) {
    nabu.site = _.extend(nabu.site, defaults, require(configPath));
  } else {
    nabu.site = _.extend(nabu.site, defaults);
  }

  // Dynamically loaded modules
  // markdown parser
  nabu.md = require(nabu.site.markdown);
  nabu.md.setOptions(nabu.site[nabu.site.markdown]);
  // templates
  nabu.render = consolidate[nabu.site.template_engine];
};

/**
 * loadPosts
 */
nabu.loadFiles = function() {
  var files = glob.sync('./**/*.*');
  // This is clear but messy
  
  // First get get rid of files that should be ignored
  var ignoredFiles = [];
  files.forEach(function(file, index) {
    var shouldIgnore = false;
    // TODO: This should be in _defaults.json
    ['node_modules','_site','_config', 'package.json'].forEach(function(ignore) {
      if (file.indexOf(ignore) !== -1) {
        ignoredFiles.push(file);
      }
    });
  });
  files = _.difference(files, ignoredFiles);

  ['posts', 'layouts', 'includes', 'templates', 'pages', 'assets'].forEach(function(folder) {
    nabu.files[folder] = files.filter(function(file, index) {
      // The first three conditionals try to detirmine as much as possible
      // from the filename, thus reducing the amount of heavy lifting later 
      // when it needs to load the file to check for yaml front matter
      
      // Is the file in any of the above folders?
      if (file.indexOf('_'+folder) !== -1) {
        delete files[index];
        return true;
      }
      // Is this a template file?
      if (folder === 'templates' && path.extname(file) === '.'+nabu.site.template_engine) {
        delete files[index];
        return true;
      }
      // Are we in the assets loop and are any of the files non-text?
      if (folder === 'assets' && mime.lookup(file).split('/')[0] !== 'text') {
        delete files[index];
        return true;
      }
      // Are we in the pages loop and do any remaining files have YAML front matter?
      // console.log(file);
      if (folder === 'pages' && yamlfm.loadFront(fs.readFileSync(file))) {
        delete files[index];
        return true;
      }
      // Assume everything left is a static asset
      if (folder === 'assets') {
        delete files[index];
        return true;
      }
    });
  });
  // Name each layout: 
  // Example: 
  //    ./_layouts/default.jade -> {'default':./_layouts/default.jade}
  var layouts = {};
  nabu.files.layouts.forEach(function(layout) {
    layouts[path.basename(layout.split('.')[1])] = layout;
  });
  nabu.files.layouts = layouts;
  
  return nabu.files;
};

/**
 * process the file at given sourcePath and structure it's meta data
 *
 * @param  {String} sourcePath path to file found by globing
 */
nabu.processFile = function(file, sourcePath) {
  file.sourcePath = sourcePath;

  if (!file.permalink) {
    file.permalink = sourcePath.substring(0, sourcePath.lastIndexOf('.'));
    // If the file is an index.html file, don't get too fancy
    if (path.basename(file.permalink) === 'index.html') {
      file.permalink = path.dirname(file.permalink);
    }
  }

  //
  if (!path.extname(file.permalink)) {
    file.permalink = path.join(file.permalink, 'index.html');
  }

  file.targetPath = targetPath(file.permalink);

  return file;
};

nabu.processContent = function(sourcePath, type) {
  var rawFile = fs.readFileSync(sourcePath, 'utf8');
  var file = yamlfm.loadFront(rawFile, 'content_raw');
  // Make sure the file 
  if (!nabu.files.layouts[file.layout]) {
    throw new Error('There is now layout file by the name of ' + file.layout + ' specified in ' + sourcePath);
  }
  
  file.layoutPath = nabu.files.layouts[file.layout];
  file.slug = _.slugify(file.title);
  file.content = nabu.md(file.content_raw);

  if (file.date) {
    file.date = moment(file.date);
  }

  if (type === 'posts') {
    //TODO: Actually obey permalink setting
    file.permalink = file.slug + '/';  
  }

  return nabu.processFile(file, sourcePath);
};

// Finish setting up this function. Does it even need to be seperate?
nabu.processTemplate = function(sourcePath) {
  var file = {};
  file.layoutPath = sourcePath;

  return nabu.processFile(file, sourcePath);
};

nabu.processFiles = function() {
  ['pages', 'posts'].forEach(function(type) {
    nabu.files[type].forEach(function(file) {
      nabu.site[type].push(nabu.processContent(file, type));
    });
  });
  nabu.files.templates.forEach(function(file) {
    nabu.site.templates.push(nabu.processTemplate(file));
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
  ['posts', 'pages'].forEach(function(folder) {
    async.forEach(nabu.site[folder], nabu.renderContent, function(err) {
      if (err) { throw err; }
    });
  });
  async.forEach(nabu.site.templates, nabu.renderTemplate, function(err) {
    if (err) { throw err; }
  });
};

/**
 * Copy over all static assets to destination folder
 */
nabu.copyAssets = function() {
  this.files.assets.forEach(function(file) {
    var target = targetPath(file);
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
  this.loadFiles();
  this.processFiles();
  this.renderSite();
  this.copyAssets();
};

module.exports = nabu;
