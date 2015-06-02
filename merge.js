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
      data: [x[dataField]],
      count: 1,
      summary: x[dataField]
    };
  });
}

function merge(nodes, dataField, levels, flag) {
  var ret = [];
  for (var i = 0; i < levels.length; i++) {
    var cp = copyList(nodes, dataField);
    var merged = mergeHelper(cp, levels[i]);
    ret.push({
      epsilon: levels[i],
      sets: merged
    });
  }
  return ret;
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
    data: _.flatten([a.data, b.data]),
    count: a.count + b.count,
    summary: combineSummaries(a, b)
  };
}

function mergeHelper(nodes, eps) {
  var out = [];
  var start = nodes;
  var end = [];

  var cur;
  while (start.length > 0) {
    start.sort(function(a, b) { return a.xmin < b.xmin ? 1 : -1; });
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

