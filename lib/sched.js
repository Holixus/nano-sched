"use strict";

var Promise = require('nano-promise'),
    newStopper = require('./stopper.js'),
    newJob = require('./job.js');

function newSched(name, opts, mill) {
	var jobs_count = 0,
	    jobs = {},
	    jid_top = 1;


	function cancel() {
		for (var id in jobs)
			jobs[id].cancel();
	}

	var resolve, reject,
	    sched = new Promise(function (res, rej) {
		resolve = res;
		reject = rej;
		return { cancel: cancel };
	});

	sched.name = name;
	sched.opts = opts;
	sched.mill = mill;

	var stoppers = {};
	sched.stopper = function (id) {
		var s = stoppers[id];
		if (s)
			return s;
		s = stoppers[id] = newStopper(id);
		s.then(function () {
			mill.signal(sched.name + '.' + id);
		}, function (err) {
		});
		return s;
	};

	sched.stopper('start');
	sched.stopper('finish');

	sched.start = function () {
		var start = stoppers.start;
		/* istanbul ignore else */
		if (start.isFree() === null)
			start.waitFor(Promise.resolve());
		return this;
	};

	sched.job = function (name, data) {
		var jid = jid_top++,
		    j = jobs[jid] = newJob(name, data, this);

		++jobs_count;

		j.then(function () {
			delete jobs[jid];
			if (!--jobs_count)
				resolve();
		}, function (err) {
			if (err !== Promise.CANCEL_REASON) {
				reject(err);
				cancel();
				throw err;
			}
			delete jobs[jid];
			if (!--jobs_count)
				resolve();
		});
		return j;
	};

	return sched;
}

module.exports = newSched;
