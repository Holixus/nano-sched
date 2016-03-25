"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer');


function uni_test(fn, sradix, dradix, args, ret) {
	test(fn.name+'('+json.js2str(args, sradix)+') -> '+json.js2str(ret, dradix)+'', function (done) {
		assert.deepStrictEqual(args instanceof Array ? fn.apply(null, args) : fn.call(null, args), ret);
		done();
	});
}

function massive(name, fn, pairs, sradix, dradix) {
	suite(name, function () {
		for (var i = 0, n = pairs.length; i < n; i += 2)
			uni_test(fn, sradix, dradix, pairs[i], pairs[i+1]);
	});
}

function fail_test(fn, sradix, dradix, args, ret) {
	test(fn.name+'('+json.js2str(args, sradix)+') -> '+json.js2str(ret.name, dradix)+'', function (done) {
		assert.throws(function () {
			if (args instanceof Array)
				fn.apply(null, args);
			else
				fn.call(null, args);
		}, ret);
		done();
	});
}

function massive_fails(name, fn, pairs, sradix, dradix) {
	suite(name, function () {
		for (var i = 0, n = pairs.length; i < n; i += 2)
			fail_test(fn, sradix, dradix, pairs[i], pairs[i+1]);
	});
}

var parse = require('../lib/seq-parser.js');

suite('parse sequences', function () {

	massive('good expressions', parse, [
		'>>', [ 'route', 'start', undefined, 'finish' ],
		'> file.dont-overwrite, file.save >', [ 'route', 'start', [ 'seq', [ 'stage', 'file', 'dont-overwrite' ], [ 'stage', 'file', 'save' ] ], 'finish' ],
		'> a >', [ 'route', 'start', [ 'stage', 'a' ], 'finish' ],
		'run > ass012_2 > menu', [ 'route', 'run', [ 'stage', 'ass012_2' ], 'menu' ],
		'l10n-collected > a.b > l10n-processed', [ 'route', 'l10n-collected', [ 'stage', 'a', 'b' ], 'l10n-processed' ],
		' 1 > a.b.c > 2', [ 'route', '1', [ 'stage', 'a', 'b', 'c' ], '2' ],
		' 1 > a,b,c,d,e > 2 ', [ 'route', '1', [ 'seq', [ 'stage', 'a' ], [ 'stage', 'b' ], [ 'stage', 'c' ], [ 'stage', 'd' ], [ 'stage', 'e' ] ], '2' ],
		'1 > a|b|c|d|e    > 2', [ 'route', '1', [ 'paral', [ 'stage', 'a' ], [ 'stage', 'b' ], [ 'stage', 'c' ], [ 'stage', 'd' ], [ 'stage', 'e' ] ], '2' ],
		'1 > a|b,c   |d|e > 2', [ 'route', '1', [ 'seq', [ 'paral', [ 'stage', 'a' ], [ 'stage', 'b' ] ], [ 'paral', [ 'stage', 'c' ], [ 'stage', 'd' ], [ 'stage', 'e' ] ] ], '2' ],
		'1 > (a|b),(c|d|e) > 2', [ 'route', '1', [ 'seq', [ 'paral', [ 'stage', 'a' ], [ 'stage', 'b' ] ], [ 'paral' , [ 'stage', 'c' ], [ 'stage', 'd' ], [ 'stage', 'e' ] ] ], '2' ],
		'1 > a|(b,c)|d|e > 2', [ 'route', '1', [ 'paral', [ 'stage', 'a' ], [ 'seq', [ 'stage', 'b' ], [ 'stage', 'c' ] ], [ 'stage', 'd' ], [ 'stage', 'e' ] ], '2' ]
	]);

	massive_fails('bad expressions', parse, [
		'', SyntaxError,
		'>$>', SyntaxError,
		'>a.>', SyntaxError,
		'>a.,>', SyntaxError,
		'>a,b$>', SyntaxError,
		'>a,b,,>', SyntaxError,
		'>a,b b,,>', SyntaxError,
		'>a,(b>', SyntaxError,
		'>a,(,>', SyntaxError,
		'>a|>,', SyntaxError,
		Object.create(null), TypeError
	]);
});
