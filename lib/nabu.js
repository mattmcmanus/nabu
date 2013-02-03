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
    globsync = require('glob-whatev'),
    fm = require('front-matter'),
    consolidate = require('consolidate');
    _.str = require('underscore.string');
    _.mixin(_.str.exports());

var defaults = require('../_defaults.json');
var configPath = cwd + '/_config.json';
var config = (fs.existsSync(configPath)) ? _.extend(defaults, require(configPath)) : defaults;

var site = {
  config: config,
  posts: []
};

// Dynamically loaded modules
// markdown parser
var md = require(site.config.markdown);
md.setOptions(site.config[site.config.markdown]);
// templates
var compile = consolidate[site.config.template_engine];

/**
 * Detirmine the path for the target file
 * 
 * @param  {[type]} post [description]
 * @return {[type]}      [description]
 */
function targetPath(post) {
  //TODO: Actually obey permalink setting
  return path.join(process.cwd(), site.config.destination, post.slug, "index.html");
}

/**
 * process the file at given filePath and structure it's meta data
 *
 * @param  {String} filePath path to file found by globing
 */
var processFile = exports.processFile = function(filePath) {
  var rawFile = fs.readFileSync(filePath, 'utf8');
  var post = fm(rawFile);
  // Flatten out the attributes object
  _.forEach(post.attributes, function(value, name){
    post[name] = value;
  });

  post.date = moment(post.date);
  post.filePath = filePath;
  post.slug = _.slugify(post.title);
  post.targetPath = targetPath(post);
  post.content_raw = post.body;
  post.content = md(post.body);

  // Tidy up
  delete post.attributes;
  delete post.body;

  // Push to the global site object
  site.posts.push(post);

  return post;
};

/**
 * loadPosts
 * @return {[type]} [description]
 */
var loadFiles = exports.loadFiles = function(pattern) {
  // Relative patterns are matched against the current working directory.
  globsync.glob(pattern + '/**/*.markdown').forEach(processFile);
};

/**
 * Render all the posts
 *
 * @param  {Object}   post     The object for an individual post
 * @param  {Function} callback the callback
 */
var renderPost = function(post, callback){
  mkdirp.sync(path.dirname(post.targetPath));

  compile(path.resolve(__dirname, '../page.jade'), post, function(err, html){
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
