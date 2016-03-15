"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer');

var newStopper = require('../lib/stopper.js');

suite('stopper', function () {

	test('1', function (done) {
		var s = newStopper('ooo'),
		    refs = 0;

		s.then(function () {
			assert.strictEqual(refs, 0);
			assert(s.isFree());
			assert.throws(() => {
				s.waitFor(timer(1));
			}, Error);
			done();
		});

		assert(!s.isFree());

		timer(1).then(function () {
			s.waitFor(timer(5).then(function () {
				--refs;
			}));
			s.waitFor(timer(4).then(function () {
				--refs;
			}));
			s.waitFor(timer(3).then(function () {
				--refs;
			}));
			s.waitFor(timer(2).then(function () {
				--refs;
			}));
			refs = 4;
		});

		assert(!s.isFree());
	});

	//var sc = new Sched('seq');
});
