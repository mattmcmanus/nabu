/*
 * nabu
 * https://github.com/mattmcmanus/nabu
 *
 * Copyright (c) 2013 Matt McManus
 * Licensed under the MIT license.
 */

'use strict';

var globsync = require('glob-whatev'),
    fs = require('fs'),
    fm = require('front-matter'),
    md = require('marked');

var site = {
  posts: []
};

/**
 * loadPosts
 * @return {[type]} [description]
 */
exports.loadPosts = function() {
  // Relative patterns are matched against the current working directory.
  globsync.glob('/Users/matt/www/nabu-site/**/*.markdown').forEach(function(filepath) {
    var raw = fs.readFileSync(filepath, 'utf8');
    var post = fm(raw);
    site.posts.push(post);
  });

  return site;
};

/**
 * renderMarkdown
 * @param  {[type]} posts [description]
 * @return {[type]}       [description]
 */
exports.renderMarkdown = function(posts) {
  posts.forEach(function(post){
    post.body = md(post.body);
  })
}