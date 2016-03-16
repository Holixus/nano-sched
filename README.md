[![Gitter][gitter-image]][gitter-url]
[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

# nano-sched
Flexible anything processing scheduler


## Usage

```js
var Mill = require('../'),
    fs = require('nano-fs'),
    Path = require('path'),
    Promise = require('nano-promise');

var mill = Mill({
	plugins_folder: './plugins',
	sources_folder: './src',
	dist_folder: './dist',
	dumps_folder: './log',
	rules: {
		'js': [ /^.*\.js$/, ' > file.load, upcase, file.save > ' ]
	}
});


mill.install('read-plugins', function readPlugins(log, opts) {
	return fs.readdir(opts.plugins_folder || './plugins')
		.then(function (list) {
			return Promise.all(list
				.map(function (name) {
					if (!/^[^.].*\.js$/.test(name))
						return;
					return fs.readFile(Path.join(opts.plugins_folder, name), 'utf8')
						.then(function (text) {
							mill.install(name.replace(/([^/]*)\.js$/,'$1'), text);
						});
				}));
	});
});

mill.install('read-tree', function readtree(log, opts) {
	return fs.readTree(opts.src_folder || './src')
		.then(function (list) {
			opts.files = list;
		});
});

mill.install('files', function (log, opts) {
	var sched = mill.sched(' rules'),
	    rules = opts.rules,
	    files = opts.files;

	for (var id in rules) {
		var rule = rules[id],
		    re = /./;

		if (rule[0] instanceof RegExp)
			re = rule.splice(0,1)[0];

		files.forEach(function (name) {
			if (!re.test(name))
				return;
			var job = sched.job(name, {
				opts: opts,
				name: name
			});
			rule.forEach(function (seq) {
				job.seq(seq);
			});
		});
	}
	return sched.start();
});

mill
	.sched('build')
		.job('init', mill.opts)
			.seq(' > (read-plugins | read-tree), files > ')
			.up
		.start();
```



[bithound-image]: https://www.bithound.io/github/Holixus/nano-sched/badges/score.svg
[bithound-url]: https://www.bithound.io/github/Holixus/nano-sched

[gitter-image]: https://badges.gitter.im/Holixus/nano-sched.svg
[gitter-url]: https://gitter.im/Holixus/nano-sched

[npm-image]: https://badge.fury.io/js/nano-sched.svg
[npm-url]: https://badge.fury.io/js/nano-sched

[github-tag]: http://img.shields.io/github/tag/Holixus/nano-sched.svg
[github-url]: https://github.com/Holixus/nano-sched/tags

[travis-image]: https://travis-ci.org/Holixus/nano-sched.svg?branch=master
[travis-url]: https://travis-ci.org/Holixus/nano-sched

[coveralls-image]: https://coveralls.io/repos/github/Holixus/nano-sched/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/Holixus/nano-sched?branch=master

[david-image]: https://david-dm.org/Holixus/nano-sched.svg
[david-url]: https://david-dm.org/Holixus/nano-sched

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: LICENSE

[downloads-image]: http://img.shields.io/npm/dt/nano-sched.svg
[downloads-url]: https://npmjs.org/package/nano-sched
