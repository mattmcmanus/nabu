/*
 * nabu-templates
 * https://github.com/mattmcmanus/nabu-cli
 *
 * Copyright (c) 2013 Matt McManus
 * Licensed under the MIT license.
 */
'use strict';

module.exports = render;

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    async = require('async'),
    _ = require('underscore'),
    templates;

var templateExtension = '.jade';


/**
 * Render all the things!
 * 
 * @param  {Object}   nabu     The full nabu object
 * @param  {Function} callback 
 */

function render(nabu, callback) {
  nabu.log.info('Rendering:');

  templates = require('nabu-render-'+nabu.site.render);

  async.parallel([
    async.apply(renderTemplates, nabu),
    async.apply(renderContent, nabu),
  ],
  function(err, results){
    callback(err, results);
  });
}


/**
 * Render all the templates that are not layouts
 * 
 * @param  {Object}   nabu     The full nabu object
 * @param  {Function} callback [description]
 */

function renderTemplates(nabu, callback) {
  var templateFiles = nabu.files.find(nabu._files, function(file){
    return (path.extname(file) === templateExtension && file.indexOf('/_') ===  -1); 
  });
  
  var layouts = templates.loadLayouts(templateFiles);
  
  var eachLayout = function(layout, next) {
    nabu.log.info(' -> ' + layout.src);
    var obj = nabu.site.helpers;
    obj.site = nabu.site;
    var html = layout.render(obj);
    var target = nabu.files.targetPath(nabu, path.basename(layout.src, templateExtension));
    
    mkdirp.sync(path.dirname(target));
    
    fs.writeFile(target, html, next);
  };

  async.each(_.toArray(layouts), eachLayout, function(err){
    callback(err);
  });
}


/**
 * Render generic templates (such as the blog index) and each individual file
 * 
 * @param  {[type]}   nabu     [description]
 * @param  {Function} callback [description]
 */

function renderContent(nabu, callback) {
  var files = [];

  // Pull the layout files out of _file list
  var layoutsPaths = nabu.files.findInFolder(nabu._files, '\/_layouts\/');

  nabu.site.layouts = templates.loadLayouts(layoutsPaths);

  // Loop through everything to find arrays with items that have .layout
  for (var collection in nabu.site) {
    if (Array.isArray(nabu.site[collection])) {
      files.push(_.filter(nabu.site[collection], hasLayout));
    }
  }

  // The above loop returns clusters of files for each 
  // collection. Flatten it to one array
  files = _.flatten(files); 

  // Go through each file and render it
  var eachFile = function(file, next) {
    renderFile(nabu, file, next);
  };

  async.each(files, eachFile, function(err){
    callback(err);
  });
}


/**
 * Render and individual file
 * 
 * @param  {Object}   nabu     Full nabu object
 * @param  {Object}   file     Object for a single parsed file
 * @param  {Function} callback
 */

function renderFile(nabu, file, callback) {
  nabu.log.info(' -> '+file.sourcePath);
  var options = {};

  // Make sure the layout file specified in the front matter exists
  if (_.isUndefined(nabu.site.layouts[file.layout])) {
    throw new Error('There is no layout file by the name of ' + file.layout + ' specified in ' + file.sourcePath);
  }

  options.page = file;
  options.site = nabu.site;

  if (file.title) { options.title = file.title; }
  if (file.content) { options.content = file.content; }

  // Make sure all the folders are made
  mkdirp.sync(path.dirname(file.targetPath));
  
  var html = nabu.site.layouts[file.layout].render(options);
  
  fs.writeFile(file.targetPath, html, function(err){
    callback(err);
  });
}


/**
 * A quick check to see if a file has declared a layout
 * 
 * @param  {Object}  item
 * @return {Boolean}
 */

function hasLayout(item) {
  return !_.isUndefined(item.layout);
}