"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer'),
    Promise = require('nano-promise'),
    util = require('util'),
    fs = require('fs');

var newSched = require('../lib/sched.js');

var plugins = {
	a: function (log, data) {
		data.text += 'a';
	},
	b: function (log, data) {
		data.text += 'b';
	},
	c: function (log, data) {
		data.text += 'c';
	},
	d: function (log, data) {
		data.text += 'd';
	},
	delay_5ms: function (log, data) {
		return timer(5);
	},
	cancel: function (log, data) {
		log.job.sched.cancel();
	},
	log: function (log, data) {
		log.log('blah');
	},
	warn: function (log, data) {
		log.warn('blah');
	},
	error: function () {
		var e = Error('error');
		e.stage = 'test-stage';
		throw e;
	},
	fail: function () {
		throw Error('fail');
	},
	noent: function () {
		fs.readFileSync('qq');
	},
	"job-cancel": function (log) {
		log.job.cancel();
	},
	stnoent: function () {
		try {
			fs.readFileSync('qq');
		} catch (e) {
			e.stage = 'qq';
			throw e;
		}
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

var mill = {
	signal: function (id) { /*console.log('signal-%s', id);*/ },
	process: function (id, log, data) {
		var pid = id.join('.');
		return plugins[id](log, data);
	}
};

suite('sched', function () {
	test('1 - just sequence', function (done) {
		var sched = newSched('test', opts, mill),
		    data = { text: '' };

		sched
			.job('one', data)
				.seq('> a,b,c,d >')
				.up
			.start();

		sched.then(function () {
			assert.strictEqual(data.text, 'abcd');
			done();
		}).catch(done);
	});

	test('2.1 - thrown error catching', function (done) {
		var sched = newSched('test', opts, mill),
		    data = { text: '' };

		sched
			.job('one', data)
				.seq('> a,b,c,d,fail >')
				.up
			.start();

		sched.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			assert.strictEqual(data.text, 'abcd');
			done();
		}).catch(done);
	});

	test('2.1.1 - thrown error catching', function (done) {
		var sched = newSched('test', opts, mill),
		    data = { text: '' };

		sched
			.job('one', data)
				.seq('> a,b,fail,c,d >')
				.up
			.start();

		sched.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			assert.strictEqual(data.text, 'ab');
			timer(2).then(function () {
				assert.strictEqual(data.text, 'ab');
				done();
			});
		}).catch(done);
	});

	test('2.2 - thrown error catching with stage', function (done) {
		var sched = newSched('test', opts, mill);

		sched
			.job('one', { text: '' })
				.seq('> a,b,c,d,error >')
				.up
			.start();

		sched.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('2.3 - force job cancel', function (done) {
		var sched = newSched('test', opts, mill),
		    data = { text: '' },
		    data2 = { text: '' },
		    data3 = { text: '' };

		sched
			.job('one', data)
				.seq('> a,b,job-cancel,c > r')
				.seq('r > d >')
				.up
			.job('two', data2)
				.seq('> a,b,c > r')
				.seq('r > d >')
				.up
			.job('three', data3)
				.seq('> a,b,c > r1')
				.seq('r1 > d >')
				.up
			.start();

		sched.then(function () {
			assert.strictEqual(data.text, 'ab');
			assert.strictEqual(data2.text, 'abcd');
			assert.strictEqual(data3.text, 'abcd');
			done();
		}).catch(done);
	});

	test('3.1 - logger and ENOENT error', function (done) {
		var sched = newSched('test', opts, mill);

		sched
			.job('one', { text: '' })
				.seq('> a,b,c,d,log,warn,noent >')
				.up
			.start();

		sched.then(function () {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT', err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('3.2 - logger and ENOENT error with stage', function (done) {
		var sched = newSched('test', opts, mill);

		sched
			.job('one', { text: '' })
				.seq('> a,b,c,d,log,warn,stnoent >')
				.up
			.start();

		sched.then(function () {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT', err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('4.1 - two sequences', function (done) {
		var sched = newSched('test', opts, mill);

		sched
			.job('one', { text: '' })
				.seq('> a,b,c,d > pt')
				.seq('pt > log,warn,noent >')
				.up
			.start();

		sched.then(function () {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT', err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('4.2 - two sequences simple data type', function (done) {
		var sched = newSched('test', opts, mill);

		sched
			.job('one', '')
				.seq('> > pt')
				.seq('pt > log,warn,noent >')
				.up
			.start();

		sched.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT', err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('5 - cancelling', function (done) {
		var sched = newSched('test', opts, mill);

		sched
			.job('one', { text: '' })
				.seq('> a,b,c,delay_5ms,d > pt')
				.seq('pt > log,warn >')
				.up
			.start();

		timer(2).then(sched.cancel);

		sched.then(function (data) {
			done(Error('not cancelled'));
		}).catch(function (err) {
			assert.strictEqual(err, Promise.CANCEL_REASON);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('6 - two jobs', function (done) {
		var sched = newSched('test', opts, mill),
		    d1 = { text: '' },
		    d2 = { text: '' };

		sched
			.job('one', d1)
				.seq('> a,b,c,d > pt')
				.seq('pt > >')
				.up
			.job('two', d2)
				.seq('> d,c,b,a > pt')
				.seq('pt > >')
				.up
			.start();

		sched.then(function (data) {
			assert.strictEqual(d1.text, 'abcd');
			assert.strictEqual(d2.text, 'dcba');
			done();
		}).catch(done);
	});
});
