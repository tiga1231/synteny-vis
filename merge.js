function copyList(L, dataField) {
  return _.map(L, function(x) {
    return {
      x1: x.x1,
      y1: x.y1,
      x2: x.x2,
      y2: x.y2,
      xmin: x.xmin,
      xmax: x.xmax,
      ymin: x.ymin,
      ymax: x.ymax,
      count: 1,
      summary: x[dataField],
      orig: x
    };
  });
}

function merge(nodes, dataField, levels, flag) {
  return _.map(levels, function(epsilon) {
    return {
      epsilon: epsilon, 
      sets: mergeHelper(copyList(nodes, dataField), epsilon)
    };
  });
}

function slope(a) {
  return (a.y2 - a.y1) / (a.x2 - a.x1);
}

function sameOrientation(a, b) {
  return slope(a) / slope(b) > 0;
}

function closeish(a, b, e) {
  return !(a.xmin > b.xmax + e || b.xmin > a.xmax + e ||
    a.ymin > b.ymax + e || b.ymin > a.ymax + e) && sameOrientation(a, b);
}

function dist2(a, b) {
  return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
}

function combine(a, b) {
  var x1 = Math.min(a.xmin, b.xmin);
  var x2 = Math.max(a.xmax, b.xmax);
  var y1 = Math.min(a.ymin, b.ymin);
  var y2 = Math.max(a.ymax, b.ymax);
  if (slope(a) < 0) {
    var temp = y1;
    y1 = y2;
    y2 = temp;
  }

  function combineSummaries(a, b) {
    return (a.summary * a.count + b.summary * b.count) / (a.count + b.count);
  }

  return {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    xmin: Math.min(a.xmin, b.xmin),
    xmax: Math.max(a.xmax, b.xmax),
    ymin: Math.min(a.ymin, b.ymin),
    ymax: Math.max(a.ymax, b.ymax),
    count: a.count + b.count,
    summary: combineSummaries(a, b)
  };
}

function mergeHelper(nodes, eps) {
  // discount quadtree
  var parts = _.groupBy(nodes, function(d) {
    return d.orig.chr1 + ' ' + d.orig.chr2
  });

  return _.chain(parts)
    .map(function (p) {
      return mergeHelper2(p, eps);
    })
    .flatten(true)
    .value();
}

function mergeHelper2(nodes, eps) {
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
        end.push(combine(cur, tmp));
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

