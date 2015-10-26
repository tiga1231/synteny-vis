const d3 = require('d3');
const _ = require('lodash');

const colorRanges = {
	rg: ['red', 'green'],
	rg_quantized: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf',
		'#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'], /* From colorbrewer */
	rainbow: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
	rainbow_quantized: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
	unselected: ['steelblue', 'steelblue'] /* d3.scale needs at least two points */
};

const samplePointsInRange = (extent, n) => {
	return _.map(_.range(n), d3.scale.linear().domain([0, n-1]).range(extent));
};

exports.onData = (data) => {
	const generateScale = (field, name) => {
		const extent = d3.extent(data, point => point[field]);
		const colors = colorRanges[name];
		const domain = samplePointsInRange(extent, colors.length);
	
		const quantize = name.indexOf('quantized') > -1;
		const scale = quantize ? d3.scale.quantize() : d3.scale.linear();
	
		return scale.domain(domain).range(colors);
	}; 

	/* _.memoize acts only on the first arg unless we tell it otherwise */
	return _.memoize(generateScale, (field, name) => field + '.' + name);
};
