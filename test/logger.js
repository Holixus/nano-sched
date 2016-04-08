"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer'),
    Promise = require('nano-promise'),
    util = require('util'),
    Path = require('path'),
    fs = require('nano-fs');

var Logger = require('../lib/logger.js'),

    dumps_folder = './',
	econsole = {
		out: [],
		log:   function () { this.out.push(' '+util.format.apply(util, arguments)); },
		error: function () { this.out.push('E'+util.format.apply(util, arguments)); },
		warn:  function () { this.out.push('W'+util.format.apply(util, arguments)); },

		reset: function () { this.out.length = 0; }
	},
    
    opts = {
		quiet: function (i) { return i === 'a'; }
	};

function newLogger(sched_name, job_name, stage, list) {
	econsole.reset();
	if (!list)
		list = 'a';
	list = list.split(/\s*,\s*/);
	return new Logger(stage, {
		name: job_name,
		sched: {
			name: sched_name,
			opts: {
				dumps_folder: dumps_folder,
				console: econsole,
				quiet: function (v) { return list.indexOf(v) >= 0; }
			}
		}
	});
};

suite('sched', function () {
	suite('log', function () {
		test('normal', function (done) {
			var log = newLogger('aa', 'bb', 'cc');

			log.log('olo', '%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 1);
			assert.strictEqual(econsole.out[0], " aa:bb#cc: test one");
			done();
		});

		test('muted', function (done) {
			var log = newLogger('aa', 'bb', 'cc');

			log.log('a', '%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 0);
			done();
		});
	});
	suite('msg', function (done) {
		test('normal', function (done) {
			var log = newLogger('aa', 'bb', 'cc');

			log.msg('olo', '%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 1);
			assert.strictEqual(econsole.out[0], " aa:bb#cc: test one");
			done();
		});

		test('muted', function (done) {
			var log = newLogger('aa', 'bb', 'cc');

			log.msg('a', '%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 0);
			done();
		});
	});
	suite('trace', function (done) {
		test('normal', function (done) {
			var log = newLogger('aa', 'bb', 'cc', '');

			log.trace('%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 1);
			assert.strictEqual(econsole.out[0], " aa:bb#cc: test one");
			done();
		});

		test('muted', function (done) {
			var log = newLogger('aa', 'bb', 'cc', 'trace');

			log.trace('%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 0);
			done();
		});
	});
	suite('warn', function (done) {
		test('normal', function (done) {
			var log = newLogger('aa', 'bb', 'cc', '');

			log.warn('www', '%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 1);
			assert.strictEqual(econsole.out[0], "Waa:bb#cc: warning: test one");
			done();
		});

		test('muted', function (done) {
			var log = newLogger('aa', 'bb', 'cc', 'trace');

			log.warn('trace', '%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 0);
			done();
		});
	});
	suite('error', function (done) {
		test('normal', function (done) {
			var log = newLogger('aa', 'bb', 'cc', '');

			log.error('%s %s', 'test', 'one');
			assert.strictEqual(econsole.out.length, 1);
			assert.strictEqual(econsole.out[0], "Eaa:bb#cc: error: test one");
			done();
		});
	});
	suite('writeListing', function (done) {
		function dump_test(content, dump, done) {
			var log = newLogger('aa', 'bb', 'cc', ''),
			    name = 'id.txt',
			    file = Path.join(dumps_folder, 'aa!bb#cc.'+name);

			log.writeListing(name, content).then(function () {
				return fs.readFile(file, 'utf8').then(function (text) {
					assert(text, dump);
					return fs.unlink(file);
				}).then(function () {
					done();
				});
			}).catch(done);
		}

		test('string', function (done) {
			dump_test('content', 'content', done);
		});

		test('boolean', function (done) {
			dump_test(true, 'true', done);
		});

		test('object', function (done) {
			dump_test({ a: 1 }, '{\n\ta:1\n}\n', done);
		});
	});
});
