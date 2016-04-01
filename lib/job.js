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
				if (err !== Promise.CANCEL_REASON) { // cancelled sequence does not abort job and higher
					reject(err);
					cancel();
					throw err;
				}
				delete seqs[sid];
				if (!--seqs_count)
					resolve(data);
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

		return ps.then(function () {
			var log = new Logger(id.join('.'), job);

			function handle_error(err) {
				if (err !== Promise.CANCEL_REASON) {
					log.fail(err);
					if (err.code === 'ENOENT') {
						err.message = [err.stage ? [ err.stage, ' \'' ].join('') : '\'', err.path, '\' not found'].join('');
						err.parsed = 1;
					}
					var msg = err.message || /* istanbul ignore next */ err.code || /* istanbul ignore next */ err;
					if (err.stage)
						log.error('fail', '[%s] %s', err.stage, msg);
					else
						log.error('fail', '%s', msg);
					/* istanbul ignore else */
					if (err.stack)
						log.error('stack', '%s', err.stack);
					log.writeListing("data.json", data);
					err.parsed = 1;
				} else {
					log.trace('cancelled');
				}
				throw err;
			}

			try {
				var ret = sched.mill.process(id, log, job.data);
			} catch (err) {
				handle_error(err);
			}

			return typeof ret === 'object' && typeof ret.then === 'function' ? ret.catch(handle_error) : ret;
		});
	};

	return job;
}

module.exports = newJob;
