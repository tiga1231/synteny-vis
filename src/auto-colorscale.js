import persistenceFuncs from './persistence';
import d3 from 'd3';

import {
  AUTO_SCALE_VALLEY_FILL
} from 'constants';

exports.generateAutoScale = (points, persistence) => {
  const extrema = persistenceFuncs.simplify(points, persistence);
  return generateColorScaleFromExtrema(extrema);
};

const isMaximum = (A, i) => (i === 0 || A[i].y > A[i - 1].y) &&
                           (i === A.length - 1 || A[i].y > A[i + 1].y);

const generateColorScaleFromExtrema = extrema => {
  const colors = d3.scale.category10();

  // We rely on the fact that every other point is a maximum.
  for(let i = 0; i < extrema.length - 1; i++) {
    if(isMaximum(extrema, i) == isMaximum(extrema, i + 1))
      console.error('Invariant violated, extrema are', extrema);
  }

  // Function calls on colorscales mutate the object, but since we call the
  // function with monotonically non-decreasing indices and the scale remembers
  // the colors it assigned to indices before, we are safe here.
  const pairs = extrema
    .map((d, i, A) => {
      var color;
      if (isMaximum(A, i)) {
        color = colors(i);
      } else if(i === 0) {
        color = colors(i + 1);
      } else if(i === A.length - 1) {
        color = colors(i - 1);
      }

      return { midpoint: d.x + d.dx / 2, color };
    })
    .filter(({ color }) => color !== undefined);

  return d3.scale.linear()
           .domain(pairs.map(d => d.midpoint))
           .range(pairs.map(d => d.color));
};

/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
