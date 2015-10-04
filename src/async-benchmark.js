var _ = require('lodash');

/*
 * I want to run a benchmark, but I don't want to block UI updates 
 * in between iterations.
 *
 * My guess is that this isn't super accurate for fast functions.
 */
exports.benchmark = function(tests, f, done) {

	var results = [];
	var testIndex = 0;

	setTimeout(function runOne() {
		if (testIndex >= tests.length)
			return done(stats(results));

		var time = timeIt(f, tests[testIndex++]);
		results.push(time);

		setTimeout(runOne, 0);
	}, 0);

	function timeIt(f, arg) {
		var start = Date.now();
		f(arg);
		return Date.now() - start;
	}

	function stats(times) {
		return {
			totalTime: _.sum(times),
			count: times.length,
			max: _.max(times),
			average: _.sum(times) / times.length
		};
	}
};
