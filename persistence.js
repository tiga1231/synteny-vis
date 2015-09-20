'use strict';

/*
 * Given a list of
 *
 * [
 *   {
 *     ...
 *     y: <function value>
 *   }
 * ]
 *
 * remove all the objects that are not extrema; that is, remove the objects
 * that have a y-value that is not higher than both its neighbor's y-values
 * or lower than both its neighbor's y-values.
 *
 * The first and last point are never removed.
 */
function removeNonExtrema(A) {
  return _.filter(A, function(element, index) {
    if(index === 0 || index === A.length - 1)
      return true;

    var before = A[index - 1].y;
    var here = element.y;
    var after = A[index + 1].y;
    return here > Math.max(before, after) || here < Math.min(before, after);
  });
}

(function removeNonExtremaTests() {

  function intsToObjects(xs) {
    return _.map(xs, function(i) {
      return {
        y: i
      };
    });
  }

  assertTrue(_.isEqual([], removeNonExtrema([])));

  assertEquals(2, removeNonExtrema(intsToObjects([1,2,3])).length);
  assertEquals(3, removeNonExtrema(intsToObjects([1,2,1])).length);
  assertEquals(3, removeNonExtrema(intsToObjects([2,1,2])).length);
  assertEquals(4, removeNonExtrema(intsToObjects([2,1,2,3,2])).length);
})();

