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
		'js': [ /^.*\.js$/, ' run > file.load, upcase, file.save > ' ]
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
	var sched = log.job.sched,
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
});

mill
	.sched('init')
		.job('init', mill.opts)
			.seq(' > read-plugins | (read-tree, files) > run ')
