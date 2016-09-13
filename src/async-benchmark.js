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

  const sum = A => A.reduce((a, b) => a + b, 0);
  const stats = times => ({
    totalTime: sum(times),
    count: times.length,
    max: Math.max(...times),
    average: sum(times) / times.length
  });
};
