"use strict";

var Promise = require('nano-promise');

/* ------------------------------------------------------------------------ */
function newStopper(name) {
	var waitFor, ps;

	function resolved() {
		ps.waitFor = function () {
			throw Error('attempt to activate a finished stopper "'+name+'"');
		};
		ps.isFree = function () {
			return 1;
		};
	}

	if (name === 'start') {
		ps = Promise.resolve();
		resolved();
		return ps;
	}

	var ps = new Promise(function (res, rej) {
		var refs = 0;
		waitFor = function (seq) {
			++refs;
			return seq.then(function () {
				if (!--refs)
					res(resolved());
			}, function (err) {
				--refs;
				resolved();
				rej(err);
				throw err;
			});
		};
	});

	ps.waitFor = waitFor;
	ps.isFree = function () { };
	return ps;
}

module.exports = newStopper;
