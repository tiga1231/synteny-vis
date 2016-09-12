const _ = require('lodash/fp');

/*
 * I want to run a benchmark, but I don't want to block UI updates 
 * in between iterations.
 *
 * My guess is that this isn't super accurate for fast functions.
 */
exports.benchmark = function(testArgs, f, done) {

  const runOne = ([test, ...rest], results) => {
    if (!test) {
      return done(stats(results));
    }

    const result = timeIt(f, test);
    setTimeout(runOne, 0, rest, [...results, result]);
  };
  setTimeout(runOne, 0, testArgs, []);

  const timeIt = function(f, arg) {
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
