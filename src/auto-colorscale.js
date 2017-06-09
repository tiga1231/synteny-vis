import persistenceFuncs from './persistence';
import d3 from 'd3';

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
  if(i == 0 && A[i].y >= 0.5 * Math.max(...A.map(x => x.y))) {
    return true;
  }
  // common case: normal maxima
  return i > 0 && i < A.length - 1 && isMaxima(A, i);
};

const generateColorScaleFromExtrema = extrema => {
  const colors = d3.scale.category10();
  // function calls into d3 colorscales mutate the object, which
  // means that the calls are order-dependent, which means
  // we need to "prime" the colormap here with the right calls

  var markedColors = [];
  var markedColorByIndex = {};
  extrema.forEach((x, i, A) => {
    if (shouldBeMarked(x,i,A)) {
      markedColorByIndex[i] = markedColors.length;
      markedColors.push(colors(i));
    }
  });

  // FIXME: this is an embarrassing amount of work to write "compute
  // the color in between two consecutive steps in the colormap".
  const colored = extrema.map((x, i, A) => {
    var color;
    if (shouldBeMarked(x, i, A)) {
      color = colors(i);
    } else if (i === 0) {
      color = markedColors[0];
    } else {
      var valleyLeft = d3.lab(markedColors[markedColorByIndex[i-1]]);
      var valleyRight = d3.lab(
        markedColors[Math.min(markedColorByIndex[i-1]+1,
                              markedColors.length-1)]);
      color = d3.lab(0.5 * (valleyLeft.l + valleyRight.l),
                     0.5 * (valleyLeft.a + valleyRight.a),
                     0.5 * (valleyLeft.b + valleyRight.b));
    }
    var result = Object.assign({}, x);
    result.color = color;
    return result;
  });

  const domain = colored.map(d => d.x + d.dx / 2);
  const range = colored.map(x => x.color);

  return d3.scale.linear().domain(domain).range(range);
};

/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
