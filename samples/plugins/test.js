"use strict";

var timer = require('nano-timer');

module.exports = {
	a: function (log, data) {
		return timer(1).then(function () {
			data.text += '[a-done]';
		});
	},
	b: function (log, data) {
		return timer(2).then(function () {
			data.text += '[b-done]';
		});
	},
	c: function (log, data) {
		return timer(3).then(function () {
			data.text += '[c-done]';
		});
	},
	d: function (log, data) {
		return timer(5).then(function () {
			data.text += '[d-done]';
		});
	}
};
