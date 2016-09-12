'use strict';

const _ = require('lodash/fp');
const d3 = require('d3');

exports.getComputedAttr = function getComputedAttr(element, attr) {
  const computed = getComputedStyle(element)[attr];
  return parseInt(computed, 10);
};

exports.samplePointsInRange = function(extent, n) {
  const scale = d3.scale.linear().domain([0, n-1]).range(extent);
  return _.map(scale, _.range(0, n));
};

exports.timeIt = function(f, name) {
  return function(...args) {
    const start = Date.now();
    const x = f(...args);
    console.log(name, Date.now() - start);
    return x;
  };
};


