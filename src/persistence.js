'use strict';

const _ = require('lodash');

exports.simplify = function simplify(dirtyPoints, persistence) {
	const points = removeNonExtrema(dirtyPoints);
	const index = indexOfSmallestPointDifference(points);

	if (points.length < 3 || gapBetweenPoints(points, index) > persistence)
		return points;

	const toRemove = index === 0 ? 1 : index;
	points.splice(toRemove, 1);

	return simplify(points, persistence);
};

function removeNonExtrema(A) {
	return _.filter(A, function(element, index) {
		if (index === 0 || index === A.length - 1)
			return true;

		const before = A[index - 1].y;
		const here = element.y;
		const after = A[index + 1].y;
		return here > Math.max(before, after) || here < Math.min(before, after);
	});
}

function gapBetweenPoints(A, i) {
	return Math.abs(A[i].y - A[i + 1].y);
}

function indexOfSmallestPointDifference(A) {
	return _(A.length - 1).range().minBy(i => gapBetweenPoints(A, i));
}
