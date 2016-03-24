"use strict";

var vm = require('vm');

function compile(src, filename) {
	var script = new vm.Script(src, { filename: filename }),
	    sandbox = {
	    	require: require,
	    	module: { exports: {} }
	    };

	script.runInContext(new vm.createContext(sandbox));

	return sandbox.module.exports;
}

function inject(self) {

	var lib = {};

	self.install = function (name, mod, filename) {
		lib[name] = typeof mod === 'string' && filename ? [ mod, filename ] : mod;
	};

	self.process = function (id /* ... */) {
		var mod = lib[id[0]];
		if (typeof mod === 'string') {
			lib[id[0]] = mod = (/^[a-z0-9_./-]{2,128}$/i.test(mod)) ? 
				require(mod) :
				compile(mod, id[0]+'.js');
		} else {
			if (mod instanceof Array)
				lib[id[0]] = mod = compile(mod[0], mod[1]);
		}

		if (typeof mod === 'object') {
			for (var i = 1, n = id.length; i < n && mod; ++i)
				mod = mod[id[i]];
		}
		if (!mod)
			throw Error('attempt to call a not installed pluging {'+id.join('.')+'}');

		if (typeof mod !== 'function')
			throw Error('plugin {'+id.join('.')+'} is not a function ');

		return mod.apply(null, Array.prototype.slice.call(arguments, 1));
	}
	return self;
}

module.exports = inject;
