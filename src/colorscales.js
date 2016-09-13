import d3 from 'd3';
import utils from './utils';

import {
  COLOR_RANGES
} from 'constants';

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

  const cached = {};
  return (field, name) => {
    const key = field + '.' + name;
    if(cached[key] === undefined) {
      cached[key] = generateScale(field, name);
    }
    return cached[key];
  };
};
