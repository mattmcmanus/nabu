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
    slugify =require('slugs'),
    _ = require('underscore'),
    async = require('async'),
    globsync = require('glob-whatev'),
    fm = require('front-matter'),
    consolidate = require('consolidate');

var config = _.extend(require('../_defaults.json'), require(cwd + '/_config.json'));

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
 * loadPosts
 * @return {[type]} [description]
 */
var loadPosts = exports.loadPosts = function(pattern) {
  // Relative patterns are matched against the current working directory.
  globsync.glob(pattern + '/**/*.markdown').forEach(function(filePath) {
    var raw = fs.readFileSync(filePath, 'utf8');
    var post = fm(raw);
    
    post.filePath = filePath;
    post.slug = slugify(post.attributes.title);
    post.targetPath = targetPath(post);

    site.posts.push(post);
  });

  return site;
};

/**
 * renderMarkdown
 * @param  {[type]} posts [description]
 * @return {[type]}       [description]
 */
var parseMarkdown = exports.parseMarkdown = function() {
  site.posts.forEach(function(post){
    post.body = md(post.body);
  });
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
  loadPosts(path);
  parseMarkdown(site.posts);
  renderSite();
};
