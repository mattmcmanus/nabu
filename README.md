# Danger! This code isn't even alpha

# Nabu {version}

Nabu is an simple, node.js powered, static site generator heavily inspired by [Jekyll](http://jekyllrb.com/). 

The goals of this tool are:

* To make the technical distance between your content and templates as small and transparent as possible
* To be completely modular, with each module doing as small and specific a task as possible
* To provide a testing ground to explore the ideas and principles of a true next generation of CMSs

## Understanding the different pieces of nabu and how it all works together

A website built with nabu is a result of a lot of small pieces working together. If you're new to nabu, it's hard to build a big picture view of all that's going on. Hopefully this will help!

* The **`nabu-cli`** is a simple tool that loads the locally installed (ie: the current folder) version of nabu. Apart from telling nabu what to do, it also gives you tools to easily create a new nabu site
* **`nabu`** is the core library. It's responsible for loading files, reading the config, setting up nabu plugins into the render pipeline and providing methods that most plugins will use
* **Nabu plugins** are tiny encapsulated pieces of code that interpret and transform content (think: blog, calendar, pagination, categories, etc). You specify the plugins your site needs in the nabu `_config.json` file. `nabu` runs through this list in serial, each plugin building off the work of the previous. Plugins are installed using npm. See the **Plugins** section for more detail
* The `_config.json` ...
* **Files & folderd prefixed with `_`**, like the aforementioned `_config.json`, are files specifically for nabu to reference or transform during site generation. For example, `_posts` contain markdown files consumed by the `nabu-blog`. You may already be familiar with this pattern from Jekyll.

## Making your first site with nabu

### Installation

To use nabu, you first need the [nabu-cli](https://github.com/mattmcmanus/nabu-cli) module globally installed:

    npm install -g nabu-cli

### Initializing your site's project folder

After the cli is installed, it's time to create the foundation your site will be built on top of:

    mkdir my-blog && cd my-blog
    nabu init

The `init` command will 

1. Ask you a couple questions about how you would like your site setup
2. Generate your site file structure, including your `package.json` and `_config.json`
3. Install any default packages from `npm`
4. Initialize a git repo and make your first commit
5. Generate the site, start up a local web server and open a browser showing you the default state of affairs

## Nabu Plugins