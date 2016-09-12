import d3 from 'd3';
import _ from 'lodash/fp';
import utils from './utils';

import {
  COLOR_RANGES
} from 'constants';

exports.onData = function(data) {
  const generateScale = function({field, name}) {
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

  /* _.memoize acts only on the first arg */
  const m = _.memoize(generateScale);
  return (field, name) => m({field, name});
};
