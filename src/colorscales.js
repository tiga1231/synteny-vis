const d3 = require('d3');
const _ = require('lodash');
const utils = require('utils.js');

const colorRanges = {
	rg: { 
		range: ['red', 'green'],
		quantized: false
	},
	rg_quantized: {
		range: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf',
			'#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'], /* From colorbrewer */
		quantized: true
	},
	rainbow: {
		range: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
		quantized: false
	},
	rainbow_quantized: {
		range: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
		quantized: true
	},
	unselected: {
		range: ['steelblue', 'steelblue'], /* d3.scale needs at least two points */
		quantized: false
	}
};

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
