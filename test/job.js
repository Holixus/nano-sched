"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer'),
    Promise = require('nano-promise'),
    util = require('util'),
    fs = require('fs');

var newStopper = require('../lib/stopper.js'),
    newJob = require('../lib/job.js');

var plugins = {
	a: function (log, data) {
		data.text += 'a';
	},
	b: function (log, data) {
		data.text += 'b';
		return Promise.resolve();
	},
	c: function (log, data) {
		data.text += 'c';
	},
	d: function (log, data) {
		data.text += 'd';
	},
	log: function (log, data) {
		log.log('info', 'blah');
		log.trace('ok');
	},
	warn: function (log, data) {
		log.warn('info', 'blah');
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
	stnoent: function () {
		try {
			fs.readFileSync('qq');
		} catch (e) {
			e.stage = 'qq';
			throw e;
		}
	}
};

function newSched() {
	var stoppers = {
		start: newStopper('start'),
		finish: newStopper('finish')
	};

	return {
		name: 'job.js',
		opts: {
			dumps_folder: '',
			console: {
				out: [],
				log:   function () { this.out.push(' '+util.format.apply(util, arguments)); },
				error: function () { this.out.push('E'+util.format.apply(util, arguments)); },
				warn:  function () { this.out.push('W'+util.format.apply(util, arguments)); }
			},
			quiet: {}
		},
		stopper: function (id) {
			return stoppers[id] || (stoppers[id] = newStopper(id));
		},
		mill: {
			process: function (id, log, data) {
				var pid = id.join('.');
				return plugins[id](log, data);
			}
		},
		start: function () {
			var start = stoppers.start;
			if (start.isFree() === null)
				start.waitFor(Promise.resolve());
		}
	};
}


suite('job', function () {
	test('1 - just sequence', function (done) {
		var sched = newSched('1'),
		    job = newJob('one', { text: '' }, sched);

		job.seq([ '> a,b,c,d >' ]);

		sched.start();

		job.then(function (data) {
			assert.strictEqual(data.text, 'abcd');
			done();
		}).catch(done);
	});

	test('2.1 - thrown error catching', function (done) {
		var sched = newSched('2.1'),
		    data = { text: '' },
		    job = newJob('one', data, sched);

		job.seq('> a,b,c,d,fail >');

		sched.start();

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			assert.strictEqual(data.text, 'abcd');
			done();
		}).catch(done);
	});

	test('2.1.1 - thrown error catching and aborting', function (done) {
		var sched = newSched('2.1.1'),
		    data = { text: '' },
		    job = newJob('one', data, sched);

		job.seq('> a,b,fail,c,d >');

		sched.start();

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			assert.strictEqual(data.text, 'ab');
			done();
		}).catch(done);
	});

	test('2.2 - thrown error catching with stage', function (done) {
		var sched = newSched('2.2'),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d,error >');

		sched.start();

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('3.1 - logger and ENOENT error', function (done) {
		var sched = newSched('3.1'),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d,log,warn,noent >');

		sched.start();

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT');
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('3.2 - logger and ENOENT error with stage', function (done) {
		var sched = newSched('3.2'),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d,log,warn,stnoent >');

		sched.start();

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT');
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('4.1 - two sequences', function (done) {
		var sched = newSched('4.1'),
		    job = newJob('one', { text: '' }, sched);

		job.seq([
			'> a,b,c,d > pt',
			'pt > log,warn,noent >'
		]);

		sched.start();

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT');
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('4.2 - two sequences simple data type', function (done) {
		var sched = newSched('4.2'),
		    job = newJob('one', '', sched);

		job.seq('> > pt');
		job.seq('pt > log,warn,noent >');

		sched.start();

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			assert.strictEqual(err.code, 'ENOENT');
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('5 - cancelling', function (done) {
		var sched = newSched('5'),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d > pt');
		job.seq('pt > log,warn,noent >');

		sched.start();

		job.cancel();

		job.then(function (data) {
			done(Error('not cancelled'));
		}).catch(function (err) {
			assert.strictEqual(err, Promise.CANCEL_REASON);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});
});
