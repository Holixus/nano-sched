"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer'),
    Promise = require('nano-promise'),
    util = require('util'),
    fs = require('fs');


var pluginsInject = require('../lib/plugins.js');

suite('plugins', function () {

	test('check result', function (done) {
		var p = pluginsInject({});
		p.install('a', {'a':function () { return 5; } });
		assert.strictEqual(p.process(['a','a']), 5);
		done();
	});

	test('check arguments passing', function (done) {
		var p = pluginsInject({}),
		    A = 'werewr',
		    B = 5.5;
		p.install('a', {'a':function (a,b) {
			assert.strictEqual(a, A);
			assert.strictEqual(b, B);
			return 5;
		} });
		assert.strictEqual(p.process(['a','a'], A, B), 5);
		done();
	});

	test('check post compile', function (done) {
		var p = pluginsInject({}),
		    A = 'werewr',
		    B = 5.5;
		p.install('a', "var assert = require('core-assert');\n\
			module.exports = function (a,b) {\n\
			assert.strictEqual(a, 'werewr');\n\
			assert.strictEqual(b, 5.5);\n\
			return 5;\n\
		};\n");
		assert.strictEqual(p.process(['a'], A, B), 5);
		done();
	});

	test('call uninstalled plugin', function (done) {
		var p = pluginsInject({}),
		    A = 'werewr',
		    B = 5.5;
		p.install('a', function (a,b) {
			assert.strictEqual(a, A);
			assert.strictEqual(b, B);
			return 5;
		});
		assert.throws(function () {
			assert.strictEqual(p.process(['b'], A, B), 5);
		}, Error);
		done();
	});

	test('call object plugin', function (done) {
		var p = pluginsInject({}),
		    A = 'werewr',
		    B = 5.5;
		p.install('a', {'a':function (a,b) {
			assert.strictEqual(a, A);
			assert.strictEqual(b, B);
			return 5;
		} });
		assert.throws(function () {
			assert.strictEqual(p.process(['a'], A, B), 5);
		}, Error);
		done();
	});
});
