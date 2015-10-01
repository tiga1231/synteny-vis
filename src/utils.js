exports.getComputedAttr = function getComputedAttr(element, attr) {
	var computed = getComputedStyle(element)[attr];
	return parseInt(computed, 10);
};

exports.translate = function translate(x, y) {
	return 'translate(' + x + ',' + y + ')';
};

