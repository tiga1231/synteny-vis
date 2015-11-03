exports.getComputedAttr = function getComputedAttr(element, attr) {
	const computed = getComputedStyle(element)[attr];
	return parseInt(computed, 10);
};

exports.samplePointsInRange = (extent, n) => {
	return _.map(_.range(n), d3.scale.linear().domain([0, n-1]).range(extent));
};


