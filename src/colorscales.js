const d3 = require('d3');
const _ = require('lodash');
const utils = require('./utils');

const {
  COLOR_RANGES
} = require('constants');

exports.onData = function(data) {
  const generateScale = function(field, name) {
    const extent = d3.extent(data, point => point[field]);

    const colorScale = COLOR_RANGES[name];
    const range = colorScale.range;
    const domain = utils.samplePointsInRange(extent, range.length);

    if (colorScale.quantized) {
      return d3.scale.quantize().domain(domain).range(range);
    } else {
      return d3.scale.linear().domain(domain).range(range);
    }
  };

  /* _.memoize acts only on the first arg unless we tell it otherwise */
  return _.memoize(generateScale, (field, name) => field + '.' + name);
};
