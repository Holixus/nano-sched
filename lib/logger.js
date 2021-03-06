"use strict";

var newUniFS = require('nano-unifs'),
    Path = require('path'),
    util = require('util');

/* ------------------------------------------------------------------------ */
function Logger(stage, job) {

	var opts = job.sched.opts,
	    dumps_folder = opts.dumps_folder || /* istanbul ignore next */ './.logs/',
	    console = opts.console || /* istanbul ignore next */ global.console,
	    quiet = opts.quiet || /* istanbul ignore next */ function () {};


	this.stage = stage;
	this.job = job;
	var context = this.context = job.sched.name + ':' + job.name + '#' + stage;

	this.log = function (code, format, a, b, etc) {
		/* istanbul ignore else */
		if (!quiet(code))
			console.log('%s: %s', context, util.format.apply(util.format, Array.prototype.slice.call(arguments, 1)));
	};

	this.msg = this.log;

	this.trace = function () {
		this.log.apply(this, Array.prototype.concat.apply(['trace'], arguments));
	};

	this.warn = function (code, format, a, b, etc) {
		/* istanbul ignore else */
		if (!quiet(code))
			console.warn('%s: warning: %s', context, util.format.apply(util.format, Array.prototype.slice.call(arguments, 1)));
	};

	this.error = function (format, a, b, etc) {
		console.error('%s: error: %s', context, util.format.apply(util.format, Array.prototype.slice.call(arguments, 1)));
	};/*

	this.fail = function (format, a, b, etc) {
		console.log('%s: FAIL: %s', context, util.format.apply(util.format, arguments));
	};*/

	this.writeListing = function (name, data) {
		var json = require('nano-json'),
		    text = typeof data === 'object' ? json.render(data, { }) : (typeof data !== 'string' ? json.js2str(data) : data),
		    self = this,
		    fs = newUniFS(dumps_folder);

		return fs.mkpath('').then(function () {
			return fs.writeFile(context.replace(/ /g, '.').replace(/:/g, '!').replace(/\//g,'+')+'.'+name, text, { encoding: 'utf8' });
		}).catch( /* istanbul ignore next */ function (e) {
			self.error('fail', e);
		});
	};
}

Logger.prototype = {
};


module.exports = Logger;
