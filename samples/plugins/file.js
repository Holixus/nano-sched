"use strict";

var fs = require('nano-fs'),
    Path = require('path');

module.exports = {

load: function (log, data) {
	var opts = data.opts,
	    src = Path.join(opts.sources_folder, data.name);
	return fs.readFile(src, data.encoding = 'utf8')
		.then(function (text) {
			data.content = text;
		});
},

save: function (log, data) {
	var opts = data.opts,
	    dst = Path.join(opts.dist_folder, data.name);

	if (typeof data.content !== 'string')
		throw Error('data content is not a string');

	return fs.mkpath(Path.dirname(dst))
		.then(function () {
			return fs.writeFile(dst, data.content, { encoding: data.encoding });
		});
},

copy: function (job, data, done) {
	var opts = data.opts,
	    src = Path.join(opts.sources_folder, data.name),
	    dst = Path.join(opts.dist_folder, data.name);

	return fs.copy(src, dst);
}

};
