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
	},
	c: function (log, data) {
		data.text += 'c';
	},
	d: function (log, data) {
		data.text += 'd';
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
	var stoppers = {};

	return {
		opts: {
			dumps_folder: '',
			console: {
				out: [],
				log:   function () { this.out.push(' '+util.format.apply(util, arguments)); },
				error: function () { this.out.push('E'+util.format.apply(util, arguments)); },
				warn:  function () { this.out.push('W'+util.format.apply(util, arguments)); }
			}
		},
		stopper: function (id) {
			return stoppers[id] || (stoppers[id] = newStopper(id));
		},
		process: function (id, log, data) {
			var pid = id.join('.');
			return plugins[id](log, data);
		}
	};
}


suite('job', function () {
	test('1 - just sequence', function (done) {
		var sched = newSched(),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d >');

		job.then(function (data) {
			assert.strictEqual(data.text, 'abcd');
			done();
		}).catch(done);
	});

	test('2.1 - thrown error catching', function (done) {
		var sched = newSched(),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d,fail >');

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('2.2 - thrown error catching with stage', function (done) {
		var sched = newSched(),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d,error >');

		job.then(function (data) {
			done(Error('not failed'));
		}).catch(function (err) {
			//console.log(err);
			//console.log(sched.opts.console.out);
			done();
		}).catch(done);
	});

	test('3.1 - logger and ENOENT error', function (done) {
		var sched = newSched(),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d,log,warn,noent >');

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
		var sched = newSched(),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d,log,warn,stnoent >');

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
		var sched = newSched(),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d > pt');
		job.seq('pt > log,warn,noent >');

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
		var sched = newSched(),
		    job = newJob('one', '', sched);

		job.seq('> > pt');
		job.seq('pt > log,warn,noent >');

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
		var sched = newSched(),
		    job = newJob('one', { text: '' }, sched);

		job.seq('> a,b,c,d > pt');
		job.seq('pt > log,warn,noent >');

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
