'use strict';

const persistenceFuncs = require('./persistence');
const d3 = require('d3');
const _ = require('lodash');

const {
  AUTO_SCALE_VALLEY_FILL
} = require('constants');

exports.generateAutoScale = function(points, persistence) {
  const extrema = persistenceFuncs.simplify(points, persistence);
  return generateColorScaleFromExtrema(extrema);
};

const isMaxima = (A, i) => A[i].y > Math.max(A[i - 1].y, A[i + 1].y);
const shouldBeMarked = (x, i, A) => i > 0 && i < A.length - 1 && isMaxima(A, i);

const generateColorScaleFromExtrema = function(extrema) {
  const colors = d3.scale.category10();

  const colored = _.map(extrema, function(x, i, A) {
    const color = shouldBeMarked(x, i, A) ? colors(i) : AUTO_SCALE_VALLEY_FILL;
    return Object.assign({}, x, {color});
  });

  const domain = _.map(colored, d => d.x + d.dx / 2);
  const range = _.map(colored, d => d.color);

  return d3.scale.linear().domain(domain).range(range);
};

