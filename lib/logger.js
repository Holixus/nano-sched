var fs = require('fs'),
    Path = require('path'),
    util = require('util');

/* ------------------------------------------------------------------------ */
function Logger(context, opts) {
	var dumps_folder = opts.dumps_folder || './',
	    console = opts.console || /* istanbul ignore next */ console,
	    quiet = opts.quiet || {};

	this.log = function (code, format, a, b, etc) {
		/* istanbul ignore else */
		if (!(code in quiet))
			console.log('%s: %s', context, util.format.apply(util.format, Array.prototype.slice.call(arguments, 1)));
	};

	this.warn = function (code, format, a, b, etc) {
		/* istanbul ignore else */
		if (!(code in quiet))
			console.warn('%s: warning: %s', context, util.format.apply(util.format, Array.prototype.slice.call(arguments, 1)));
	};

	this.error = function (format, a, b, etc) {
		console.error('%s: error: %s', context, util.format.apply(util.format, Array.prototype.slice.call(arguments, 1)));
	};

	this.fail = function (format, a, b, etc) {
		console.log('%s: FAIL: %s', context, util.format.apply(util.format, arguments));
	};

	this.writeListing = function (name, data) {
		var json = require('nano-json');
		var text = typeof data === 'object' ? json.render(data, { }) : json.js2str(data);
		fs.writeFileSync(Path.join(dumps_folder, name), text, { encoding: 'utf8' });
	};
}

Logger.prototype = {
};


module.exports = Logger;
