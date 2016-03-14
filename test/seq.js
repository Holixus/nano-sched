"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer');

var newSeq = require('../lib/seq.js'),
    parseSeq = require('../lib/seq-parser');

suite('seq', function () {

	test('sequental', function (done) {
		var data = {
		    	text: ''
		    },
		    ast = parseSeq('a > a,b,c,d > b'),
		    s = newSeq({
		    	stage: function (ps, id) {
		    		return ps.then(function () {
		    			data.text += id.join('.');
		    		});
		    	}
		    }, Promise.resolve(''), ast[2]);

		s.then(function () {
			assert.strictEqual(data.text, 'abcd');
			done();
		}).catch(done);
	});

	test('parallel', function (done) {
		var data = {
		    	text: ''
		    },
		    ast = parseSeq('a > a|b|c|d > b'),
		    s = newSeq({
		    	stage: function (ps, id) {
		    		return ps.then(function () {
		    			data.text += id.join('.');
		    		});
		    	}
		    }, Promise.resolve(''), ast[2]);

		s.then(function () {
			assert.strictEqual(data.text, 'abcd');
			done();
		}).catch(done);
	});
});
