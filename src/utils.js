exports.getComputedAttr = function getComputedAttr(element, attr) {
	const computed = getComputedStyle(element)[attr];
	return parseInt(computed, 10);
};

