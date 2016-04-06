"use strict";

var Path = require('path'),
    util = require('util'),
    newSched = require('./lib/sched.js'),
    injectPlugins = require('./lib/plugins.js');

function Mill(opts) {
	var start_time = process.hrtime();

	this.opts = opts;

	if (!opts.quiet)
		opts.quiet = function () {};

	this.time = function () {
		var d = process.hrtime(start_time);
		return (d[0] + d[1]/1e9).toFixed(3);
	};

	injectPlugins(this);

	/* istanbul ignore else */
	if (opts.plugins)
		for (var id in opts.plugins)
			this.install(id, opts.plugins[id]);
}

Mill.prototype = {
	signal: function (name) {
		if (!this.opts.quiet.timing)
			(this.opts.console || /* istanbul ignore next */ console).log('%ss %s', this.time(), name.replace('#','.'));
	},

	sched: function (name) {
		return newSched(name, this.opts, this);
	}
};



/* ------------------------------------------------------------------------ */
module.exports = function (opts) {
	return new Mill(opts);
};
