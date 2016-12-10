import d3 from 'd3';

exports.getComputedAttr = function getComputedAttr(element, attr) {
  const computed = getComputedStyle(element)[attr];
  return parseInt(computed, 10);
};

exports.samplePointsInRange = function(extent, n) {
  const scale = d3.scale.linear().domain([0, n-1]).range(extent);
  return Array(n).fill(0).map((_, i) => scale(i));
};

exports.timeIt = function(f, name) {
  return function(...args) {
    const start = Date.now();
    const x = f(...args);
    console.log(name, Date.now() - start);
    return x;
  };
};

exports.zipObject = function(ks, vs) {
  const o = {};
  for(let i = 0; i < ks.length; i++) {
    o[ks[i]] = vs[i];
  }
  return o;
};

exports.zipWith = function(f, as, bs) {
  const v = [];
  for(let i = 0; i < as.length; i++) {
    v.push(f(as[i], bs[i]));
  }
  return v;
};

exports.minBy = function(f, xs) {
  let min = xs[0];
  let minVal = f(min);
  for(let i = 1; i < xs.length; i++) {
    if(f(xs[i]) < minVal) {
      minVal = f(xs[i]);
      min = xs[i];
    }
  }
  return min;
};

exports.debounced = function(ms, f) {
  let last_invoke = undefined;
  let timeoutID = undefined;
  return function debounced(...args) {
    if(last_invoke === undefined || Date.now() - last_invoke < ms) {
      last_invoke = Date.now();
      clearTimeout(timeoutID);
      timeoutID = setTimeout(debounced, ms, ...args);
      return;
    }
    last_invoke = undefined;
    clearTimeout(timeoutID);
    timeoutID = undefined;
    f(...args);
  };
};
