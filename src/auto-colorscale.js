import persistenceFuncs from './persistence';
import d3 from 'd3';
import _ from 'lodash/fp';

import {
  AUTO_SCALE_VALLEY_FILL
} from 'constants';

exports.generateAutoScale = (points, persistence) => {
  const extrema = persistenceFuncs.simplify(points, persistence);
  return generateColorScaleFromExtrema(extrema);
};

const isMaxima = (A, i) => A[i].y > Math.max(A[i - 1].y, A[i + 1].y);
const shouldBeMarked = (x, i, A) => {
  // This is bad, but we are special casing the first maximum if it is "big."
  // This gives the ks == 0 spike color.
  if(i == 0 && A[i].y >= _.max(_.map(x => x.y, A))) {
    return true;
  }
  // common case: normal maxima
  return i > 0 && i < A.length - 1 && isMaxima(A, i);
};

const generateColorScaleFromExtrema = extrema => {
  const colors = d3.scale.category10();

  const colored = extrema.map((x, i, A) => {
    const color = shouldBeMarked(x, i, A) ? colors(i) : AUTO_SCALE_VALLEY_FILL;
    return { ...x, color };
  });

  const domain = _.map(d => d.x + d.dx / 2, colored);
  const range = _.map(_.get('color'), colored);

  return d3.scale.linear().domain(domain).range(range);
};

