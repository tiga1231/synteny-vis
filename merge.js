function copyList(L, dataFields, combinators) {
  return _.map(L, function(x) {
    var ret = {
      x1: x.x1,
      y1: x.y1,
      x2: x.x2,
      y2: x.y2,
      xmin: x.xmin,
      xmax: x.xmax,
      ymin: x.ymin,
      ymax: x.ymax,
      count: 1,
      orig: x
    };
    ret.summary = {};
    _.each(dataFields, function(f) {
      ret.summary[f] = {};
      _.each(_.keys(combinators), function(k) {
        ret.summary[f][k] = x[f];
      });
    });
    return ret;
  });
}

function average(a, b, field) {
  return (a.summary[field].average * a.count + b.summary[field].average * b.count) / (a.count + b.count);
}

function merge(nodes, dataFields, levels, combinators) {
  combinators = combinators || {
    average: average
  };
  return _.map(levels, function(epsilon) {
    return {
      epsilon: epsilon,
      sets: mergeHelper(copyList(nodes, dataFields, combinators), epsilon, combinators)
    };
  });
}

function slope(a) {
  return (a.y2 - a.y1) / (a.x2 - a.x1);
}

function sameOrientation(a, b) {
  return true; //slope(a) / slope(b) > 0;
}

function closeish(a, b, e) {
  return !(a.xmin > b.xmax + e || b.xmin > a.xmax + e ||
    a.ymin > b.ymax + e || b.ymin > a.ymax + e) && sameOrientation(a, b);
}

function dist2(a, b) {
  return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
}

function combine(a, b, combinators) {
  var x1 = Math.min(a.xmin, b.xmin);
  var x2 = Math.max(a.xmax, b.xmax);
  var y1 = Math.min(a.ymin, b.ymin);
  var y2 = Math.max(a.ymax, b.ymax);
  if (slope(a) < 0) {
    var temp = y1;
    y1 = y2;
    y2 = temp;
  }

  var ret = {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    xmin: Math.min(a.xmin, b.xmin),
    xmax: Math.max(a.xmax, b.xmax),
    ymin: Math.min(a.ymin, b.ymin),
    ymax: Math.max(a.ymax, b.ymax),
    count: a.count + b.count,
  };
  ret.summary = {};
  _.each(_.keys(a.summary), function(field) {
    ret.summary[field] = {};
    _.each(_.pairs(combinators), function(p) {
      var k = p[0];
      var f = p[1];
      ret.summary[field][k] = f(a, b, field);
    });

  })
  return ret;
}

function mergeHelper(nodes, eps, combinators) {
  // discount quadtree
  var parts = _.groupBy(nodes, function(d) {
    return d.orig.chr1 + ' ' + d.orig.chr2
  });

  return _.chain(parts)
    .map(function(p) {
      return mergeHelper2(p, eps, combinators);
    })
    .flatten(true)
    .value();
}

function mergeHelper2(nodes, eps, combinators) {
  var out = [];
  var start = nodes;
  var end = [];

  // Crappy way to do a queue, but it doesn't slow us down too much
  var cur;
  while (start.length > 0) {
    cur = start.pop();
    while (start.length > 0) {
      var tmp = start.pop();
      if (closeish(cur, tmp, eps)) {
        end.push(combine(cur, tmp, combinators));
        end.push.apply(end, start);
        start = end;
        end = [];
        cur = start.pop();
      } else {
        end.push(tmp);
      }
    }
    start = end;
    end = [];
    out.push(cur);
  }
  return out;
}

