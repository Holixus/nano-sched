"use strict";

var Promise = require('nano-promise'),
    Logger = require('./logger.js'),
    parseSeq = require('./seq-parser'),
    newStopper = require('./stopper.js'),
    newSeq = require('./seq.js');


/* ------------------------------------------------------------------------ */
function newJob(name, data, sched) {
	var seqs_count = 0,
	    seqs = {},
	    sid_top = 1;

	var resolve, reject;

	function cancel() {
		for (var id in seqs)
			seqs[id].cancel();
	}

	var job = new Promise(function (res, rej) {
		resolve = res;
		reject = rej;
		return { cancel: cancel };
	});

	job.name = name;
	job.data = data;
	job.sched = sched;

	job.seq = function (seq) {
		function add(seq) {
			var ast = parseSeq(seq); // [ 'route', 'start', ast, 'finish' ]

			++seqs_count;
			var sid = sid_top++;

			var s = seqs[sid] = newSeq(job, sched.stopper(ast[1]), ast[2]).then(function () {
				delete seqs[sid];
				if (!--seqs_count)
					resolve(data);
			}, function (err) {
				delete seqs[sid];
				--seqs_count;
				throw err;
			}).catch(function (err) {
				reject(err);
				cancel();
			});

			sched.stopper(ast[3]).waitFor(s);
		}

		if (seq instanceof Array)
			seq.forEach(add);
		else
			add(seq);

		return job;
	};
	job.up = sched;

	job.stage = function (ps, id) {
		var log = new Logger(id.join('.'), job);
		return ps.then(function () {
			return new Promise(function (res) {
				var ret = sched.mill.process(id, log, job.data);
				res(ret);
				if (typeof ret === 'object' && typeof ret.then === 'function')
					return { cancel: function () {
						ret.cancel();
					}};
			})/*;
			return Promise.resolve().then(function () {
				return sched.mill.process(id, log, job.data);
			})*/.catch(function (err) {
				if (err !== Promise.CANCEL_REASON) {
					log.fail(err);
					if (err.code === 'ENOENT') {
						err.message = [err.stage ? [ err.stage, ' \'' ].join('') : '\'', err.path, '\' not found'].join('');
						err.parsed = 1;
					}
					var msg = err.message || /* istanbul ignore next */ err.code || /* istanbul ignore next */ err;
					if (err.stage)
						log.error("[%s] %s", err.stage, msg);
					else
						log.error("%s", msg);
					/* istanbul ignore else */
					if (err.stack)
						log.error('catched', '%s', err.stack);
					log.writeListing("data.json", data);
					err.parsed = 1;
				} else {
					log.error('cancelled');
				}
				throw err;
			});
		});
	};

	return job;
}

module.exports = newJob;
