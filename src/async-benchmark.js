const _ = require('lodash');

/*
 * I want to run a benchmark, but I don't want to block UI updates 
 * in between iterations.
 *
 * My guess is that this isn't super accurate for fast functions.
 */
exports.benchmark = (testArgs, f, done) => {

	const results = [];
	const runOne = tests => {
		if (!tests.length)
			return done(stats(results));

		results.push(timeIt(f, tests[0]));
		setTimeout(runOne, 0, tests.slice(1));
	};
	setTimeout(runOne, 0, testArgs);

	const timeIt = (f, arg) => {
		const start = Date.now();
		f(arg);
		return Date.now() - start;
	};

	const stats = times => ({
		totalTime: _.sum(times),
		count: times.length,
		max: _.max(times),
		average: _.sum(times) / times.length
	});
};
