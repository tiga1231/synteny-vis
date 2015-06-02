function copyList(L, dataField) {
  return _.map(L, function(x) {
    return {
      adjustedStart1: x.adjustedStart1,
      adjustedStart2: x.adjustedStart2,
      adjustedStop1: x.adjustedStop1,
      adjustedStop2: x.adjustedStop2,
      xmin: x.xmin,
      xmax: x.xmax,
      ymin: x.ymin,
      ymax: x.ymax,
      data: x[dataField],
      count: 1
    };
  });
}

function merge(nodes, dataField, levels) {
  var ret = [];
  console.log(levels.length);
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
  return (a.adjustedStop2 - a.adjustedStart2) / (a.adjustedStop1 - a.adjustedStart1);
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
  var adjx1 = Math.min(a.xmin, b.xmin);
  var adjx2 = Math.max(a.xmax, b.xmax);
  var adjy1 = Math.min(a.ymin, b.ymin);
  var adjy2 = Math.max(a.ymax, b.ymax);
  if (slope(a) < 0) {
    var temp = adjy1;
    adjy1 = adjy2;
    adjy2 = temp;
  }

  return {
    adjustedStart1: adjx1,
    adjustedStart2: adjy1,
    adjustedStop1: adjx2,
    adjustedStop2: adjy2,
    xmin: Math.min(a.xmin, b.xmin),
    xmax: Math.max(a.xmax, b.xmax),
    ymin: Math.min(a.ymin, b.ymin),
    ymax: Math.max(a.ymax, b.ymax),
    data: (a.data * a.count + b.data * b.count) / (a.count + b.count),
    count: a.count + b.count
  };
}

function presort(nodes) {
  var p = _.partition(nodes, function(x) {
    return slope(x) < 0;
  });
  var q = p[0];
  var r = p[1];
  q.sort(function(a, b) {
    return a.xmin < b.xmin ? 1 : -1;
  });
  r.sort(function(a, b) {
    return a.xmin < b.xmin ? 1 : -1;
  });
  q.push.apply(q, r);
  return q;
}

function shove(a, b) {
  a.push.apply(a, b);
  return a;
}

function mergeHelper(nodes, eps) {
  var out = [];
  var start = nodes;
  var end = [];

  var cur;
  while (start.length > 0) {
    cur = start.pop();
    while (start.length > 0) {
      var tmp = start.pop();
      if (closeish(cur, tmp, eps)) {
        end.push(combine(cur, tmp));
        //end.push.apply(end, start);
        end = shove(end,start);
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

function build_bvh(nodes, dataField) {
  if (nodes.length === 0) {
    return null;
  }

  if (nodes.length === 1) {
    var node = nodes[0];
    return {
      "xmin": node.xmin,
      "xmax": node.xmax,
      "ymin": node.ymin,
      "ymax": node.ymax,
      "data": [node[dataField]],
      "left": null,
      "right": null
    };
  }

  var xmin = d3.min(nodes, function(d) {
    return d.xmin;
  });
  var xmax = d3.max(nodes, function(d) {
    return d.xmax;
  });
  var ymin = d3.min(nodes, function(d) {
    return d.ymin;
  });
  var ymax = d3.max(nodes, function(d) {
    return d.ymax;
  });

  var xwidth = xmax - xmin;
  var ywidth = ymax - ymin;

  var pieces;
  if (xwidth > ywidth) {
    var middle = (xmax + xmin) / 2;
    pieces = _.partition(nodes, function(d) {
      return Math.max(d.xmax) < middle;
    });
  } else {
    var middle = (ymax + ymin) / 2;
    pieces = _.partition(nodes, function(d) {
      return Math.max(d.ymax) < middle;
    });
  }

  var data = _.pluck(nodes, dataField);

  var thisNode = {
    "xmin": xmin,
    "xmax": xmax,
    "ymin": ymin,
    "ymax": ymax,
    "data": data
  };
  if (pieces[0].length === 0 || pieces[1].length === 0) {
    thisNode.left = null;
    thisNode.right = null;
  } else {
    thisNode.left = build_bvh(pieces[0], dataField);
    thisNode.right = build_bvh(pieces[1], dataField)
  }
  return thisNode;
}

function intersect(a, b) {
  return !(a.xmin > b.xmax || b.xmin > a.xmax ||
    a.ymin > b.ymax || b.ymin > a.ymax);
}

function containedIn(small, big) {
  return small.xmin > big.xmin && small.xmax < big.xmax &&
    small.ymin > big.ymin && small.ymax < big.ymax;
}

function find_bvh(nodes, bbox) {
  if (containedIn(nodes, bbox)) {
    return nodes.data;
  } else if (intersect(nodes, bbox)) {
    var left = nodes.left ? find_bvh(nodes.left, bbox) : [];
    var right = nodes.right ? find_bvh(nodes.right, bbox) : [];
    return _.flatten([left, right]);
  } else {
    return [];
  }
}

