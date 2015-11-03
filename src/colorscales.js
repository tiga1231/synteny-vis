const d3 = require('d3');
const _ = require('lodash');
const utils = require('utils');

const {
	COLOR_RANGES
} = require('constants');

exports.onData = (data) => {
	const generateScale = (field, name) => {
		const extent = d3.extent(data, point => point[field]);

		const colorScale = colorRanges[name];
		const range = colorScale.range;
		const domain = utils.samplePointsInRange(extent, range.length);
	
		const scale = colorScale.quantized ? d3.scale.quantize() : d3.scale.linear();
	
		return scale.domain(domain).range(range);
	}; 

	/* _.memoize acts only on the first arg unless we tell it otherwise */
	return _.memoize(generateScale, (field, name) => field + '.' + name);
};
