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
    cwd = process.cwd(),
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

// Nabu actions!
var n = {};

// Site Data
var site = {
  config: {},
  files: {
    'posts':[],
    'pages':[],
    'layouts':[],
    'includes':[],
    'assets':[]
  },
  posts: [],
  pages: [],
};

// 1. Get a list of all the files
// 2. Detirmine content (md), templates, and static assets
// 3. process posts and pages - extract meta data, etc
// 4. Render pages - put in same relative location
// 5. Render posts - permalinks
// 6. Copy assets
var bootstrap = exports.bootstrap = function(){
  // Configuration!
  var defaults = require('../_defaults.json');
  var configPath = cwd + '/_config.json';
  
  site.config = (fs.existsSync(configPath)) ? _.extend(defaults, require(configPath)) : defaults;

  // Dynamically loaded modules
  // markdown parser
  n.md = require(site.config.markdown);
  n.md.setOptions(site.config[site.config.markdown]);
  // templates
  n.compile = consolidate[site.config.template_engine];
};

/**
 * process the file at given filePath and structure it's meta data
 *
 * @param  {String} filePath path to file found by globing
 */
var processFile = exports.processFile = function(filePath) {
  var rawFile = fs.readFileSync(filePath, 'utf8');
  var post = yamlfm.loadFront(rawFile);

  if (post.date) {
    post.date = moment(post.date);
  }
  
  post.filePath = filePath;
  post.content_raw = post.__content;
  post.content = n.md(post.__content);

  //TODO: Actually obey permalink setting
  post.slug = _.slugify(post.title);
  post.permalink = post.slug;
  post.targetPath = path.join(process.cwd(), site.config.destination, post.permalink, "index.html");

  // Tidy up
  delete post.__content;

  // Push to the global site object
  site.posts.push(post);

  return post;
};

/**
 * loadPosts
 * 
 * @return {[type]} [description]
 */
var loadFiles = exports.loadFiles = function(pattern) {
  var files = glob.sync(pattern||'./**/*.*');

  ['posts', 'layouts', 'includes', 'pages', 'assets'].forEach(function(folder){
    site.files[folder] = _.filter(files, function(file, index){
      if (file.indexOf('_'+folder) !== -1) {
        delete files[index];
        return true;
      }
      if (folder === 'assets' && mime.lookup(file).split('/')[0] !== 'text') {
        delete files[index];
        return true;
      }
      if (folder === 'pages' && yamlfm.loadFront(fs.readFileSync(file))) {
        delete files[index];
        return true;
      }
      if (folder === 'assets'){
        delete files[index];
        return true;
      }
    });
  });

  return site.files;
};

/**
 * Render all the posts
 *
 * @param  {Object}   post     The object for an individual post
 * @param  {Function} callback the callback
 */
var renderPost = function(post, callback){
  mkdirp.sync(path.dirname(post.targetPath));

  n.compile(path.resolve(__dirname, '../page.jade'), post, function(err, html){
    if (err) { throw err; }
    fs.writeFile(post.targetPath, html, callback);
  });
};

/**
 * Render all the pages and save them
 * 
 * @return {[type]} [description]
 */
var renderSite = exports.renderSite = function(){
  async.forEach(site.posts, renderPost, function(err){
    if (err) { throw err; }
    console.log("DONE!");
  });
};

/**
 * Generate the site
 *
 * @param  {[type]} path [description]
 */
exports.generate = function(path){
  loadFiles(path);
  renderSite();
};
