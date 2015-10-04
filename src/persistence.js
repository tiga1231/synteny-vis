'use strict';

var _ = require('lodash');

/*
 * Given a list of
 *
 * [{y: <function value>}]
 *
 * remove all the objects that are not extrema; that is, remove the objects
 * that have a y-value that is not higher than both its neighbor's y-values
 * or lower than both its neighbor's y-values.
 *
 * The first and last point are never removed.
 */
exports.removeNonExtrema = function removeNonExtrema(A) {
	return _.filter(A, function(element, index) {
		if (index === 0 || index === A.length - 1)
			return true;

		var before = A[index - 1].y;
		var here = element.y;
		var after = A[index + 1].y;
		return here > Math.max(before, after) || here < Math.min(before, after);
	});
};

