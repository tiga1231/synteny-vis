var should = require('should');
var _ = require('lodash');
var test = require('../persistence.js');

var removeNonExtrema = test.removeNonExtrema;

function intsToObjects(xs) {
  return _.map(xs, function(i) {
    return {
      y: i
    };
  });
}

describe("removeNonExtrema", function() {

  it("should return empty array if given empty array", function() {
    removeNonExtrema([]).length.should.be.exactly(0); 
  });

});
//assertTrue(_.isEqual([], removeNonExtrema([])));
//
//assertEquals(2, removeNonExtrema(intsToObjects([1, 2, 3])).length);
//assertEquals(3, removeNonExtrema(intsToObjects([1, 2, 1])).length);
//assertEquals(3, removeNonExtrema(intsToObjects([2, 1, 2])).length);
//assertEquals(4, removeNonExtrema(intsToObjects([2, 1, 2, 3, 2])).length);

