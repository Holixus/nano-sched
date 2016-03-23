"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer'),
    Promise = require('nano-promise'),
    util = require('util'),
    fs = require('fs');


var plugins = {
	a: function (log, data) {
		return timer(1).then(function () {
			data.text += '[a-done]';
		});
	},
	b: function (log, data) {
		return timer(2).then(function () {
			data.text += '[b-done]';
		});
	},
	c: function (log, data) {
		return timer(3).then(function () {
			data.text += '[c-done]';
		});
	},
	d: function (log, data) {
		return timer(5).then(function () {
			data.text += '[d-done]';
		});
	},
	fail: function (log, data) {
		throw Error('fail');
	},
	'cancel-job': function (log, data) {
		log.job.cancel();
	},
	'cancel-seq': function (log, data) {
		throw Promise.CANCEL_REASON
	},
	test: __dirname+'/../samples/plugins/test.js'
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

var Mill = require('../index.js');

suite('mill', function () {
	test('1 - then sched', function (done) {
		var mill = Mill(opts),
		    sched = mill.sched('test'),
		    data = { text: '' };

		sched
			.job('one', data)
				.seq('> test.d, test.c, test.b, test.a >')
				.up
			.start();

		sched.then(function () {
			assert.strictEqual(data.text, '[d-done][c-done][b-done][a-done]');
			timer(2).then(function () {
				var log_rows = opts.console.out;
				assert(log_rows[0].match(/^ \d\.\d{3}s test.start$/));
				assert(log_rows[1].match(/^ \d\.\d{3}s test.finish$/));
				done();
			});
		}).catch(done);
	});

	test('2 - then failed sched', function (done) {
		var mill = Mill({
		    	plugins: plugins,
		    	console: opts.console,
		    	quiet: { timing:1 },
		    }),
		    sched = mill.sched('test'),
		    data = { text: '' };

		sched
			.job('one', data)
				.seq('> fail >')
				.up
			.start();

		sched.then(function () {
			done(Error('not failed'));
		}).catch(function (err) {
			assert.strictEqual(err.message, 'fail');
			done();
		}).catch(done);
	});

	test('3 - cancell of a sequence doesn`t abort other jobs', function (done) {
		var mill = Mill({
		    	plugins: plugins,
		    	console: opts.console,
		    	quiet: { timing:1 },
		    }),
		    sched = mill.sched('test'),
		    data = { text: '' },
		    data2 = { text: '' };

		sched
			.job('one', data)
				.seq('> a,b,c,d >')
				.seq('> cancel-seq,a,b,c,d >')
				.up
			.job('one', data2)
				.seq('> d,c,b,a >')
				.seq('> cancel-seq,a,b,c,d >')
				.up
			.start();

		sched.then(function () {
			assert(data.text, '[a-done][b-done][c-done][d-done]');
			assert(data2.text, '[d-done][c-done][b-done][a-done]');
			done();
		}).catch(done);
	});

	test('4 - cancell of a job doesn`t abort scheduler', function (done) {
		var mill = Mill({
		    	plugins: plugins,
		    	console: opts.console,
		    	quiet: { timing:1 },
		    }),
		    sched = mill.sched('test'),
		    data = { text: '' },
		    data2 = { text: '' };

		var jobA = 
			sched
				.job('one', data)
					.seq('> a,b,c,d >')
					.seq('> cancel-seq,a,b,c,d >');

		var jobB = 
			sched
				.job('one', data2)
					.seq('> d,c,b,a >')
					.seq('> cancel-job,a,b,c,d >')
					.up
				.start();

		sched.then(function () {
			assert.strictEqual(data.text, '[a-done][b-done][c-done][d-done]');
			assert.strictEqual(data2.text, '');
			done();
		}).catch(done);
	});
});
