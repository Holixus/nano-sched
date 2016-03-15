"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer'),
    Promise = require('nano-promise'),
    util = require('util'),
    fs = require('fs');


var plugins = {
	d: function (log, data) {
		return timer(5).then(function () {
			data.text += 'done';
		});
	}
};

var opts = {
		dumps_folder: '',
		console: {
			out: [],
			log:   function () { this.out.push(' '+util.format.apply(util, arguments)); },
			error: function () { this.out.push('E'+util.format.apply(util, arguments)); },
			warn:  function () { this.out.push('W'+util.format.apply(util, arguments)); }
		},
		plugins: plugins
	};

var mill = require('../index.js')(opts)

suite('mill', function () {
	test('1 - just sched', function (done) {
		var sched = mill.sched('test'),
		    data = { text: '' };

		sched
			.job('one', data)
				.seq('> d >');

		sched.then(function () {
			assert.strictEqual(data.text, 'done');
			return timer(2).then(function () {
				var log_rows = opts.console.out;
				assert(log_rows[0].match(/^ \d\.\d{3}s test.start$/));
				assert(log_rows[1].match(/^ \d\.\d{3}s test.finish$/));
				done();
			});
		}).catch(done);
	});
});
