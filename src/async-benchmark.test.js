import should from 'should';
import _ from 'lodash/fp';

import asyncBenchmark from '../src/async-benchmark';

describe('async-benchmark', function() {

  it('should give an accurate count of tests run', function(done) {
    asyncBenchmark.benchmark([1, 2, 3, 4], _.constant(1), function(info) {
      info.count.should.be.exactly(4);
      done();
    });
  });

});
