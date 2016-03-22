"use strict";

function inject(self) {

	var lib = {};

	self.install = function (name, mod) {
		lib[name] = mod;
	};

	self.process = function (id /* ... */) {
		var mod = lib[id[0]];
		if (typeof mod === 'string') {
			if (/^[a-z0-9-_./]{2,64}$/.test(mod)) {
				mod = require(mod);
			} else {
				var f = new Function ('require,module', mod), // compile module
				    module = { exports: undefined };
				f(require,module);
				mod = module.exports;
			}
			lib[id[0]] = mod
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
