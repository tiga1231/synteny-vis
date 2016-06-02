'use strict';

const should = require('should');
const _ = require('lodash-fp');

const asyncBenchmark = require('../src/async-benchmark');

describe('async-benchmark', function() {

	it('should give an accurate count of tests run', function(done) {
		asyncBenchmark.benchmark([1, 2, 3, 4], _.constant(1), function(info) {
			info.count.should.be.exactly(4);
			done();
		});
	});

});
