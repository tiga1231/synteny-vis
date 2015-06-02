/* 
 * bvh_build expects a data array with elements that have the
 * following fields:
 *
 *  xmin, xmax, ymin, ymax
 */

function bvh_build(nodes) {
  var xmin = _.min(nodes, function(d) {
    return d.xmin;
  }).xmin;
  var xmax = _.max(nodes, function(d) {
    return d.xmax;
  }).xmax;
  var ymin = _.min(nodes, function(d) {
    return d.ymin;
  }).ymin;
  var ymax = _.max(nodes, function(d) {
    return d.ymax;
  }).ymax;

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

  var thisNode = {
    "xmin": xmin,
    "xmax": xmax,
    "ymin": ymin,
    "ymax": ymax,
    "data": nodes
  };

  if (pieces[0].length === 0 || pieces[1].length === 0) {
    thisNode.left = null;
    thisNode.right = null;
  } else {
    thisNode.left = bvh_build(pieces[0]);
    thisNode.right = bvh_build(pieces[1])
  }
  return thisNode;
}

function intersect(a, b) {
  return !(a.xmin > b.xmax || b.xmin > a.xmax ||
    a.ymin > b.ymax || b.ymin > a.ymax);
}

function containedIn(small, big) {
  return small.xmin >= big.xmin && small.xmax <= big.xmax &&
    small.ymin >= big.ymin && small.ymax <= big.ymax;
}

function bvh_find(nodes, bbox) {
  if (containedIn(nodes, bbox)) {
    return nodes.data;
  } else if (intersect(nodes, bbox)) {
    var left = nodes.left ? bvh_find(nodes.left, bbox) : [];
    var right = nodes.right ? bvh_find(nodes.right, bbox) : [];
    return _.flatten([left, right]);
  } else {
    return [];
  }
}

function bvh_find_summary(nodes, bbox) {
  function empty_bin() {
    return _.map(nodes.bins, function(d) {
      return {
        x: d.x,
        dx: d.dx,
        y: 0
      };
    });
  }

  if (containedIn(nodes, bbox)) {
    return nodes.bins;
  } else if (intersect(nodes, bbox)) {
    var left = nodes.left ? bvh_find_summary(nodes.left, bbox) : empty_bin();
    var right = nodes.right ? bvh_find_summary(nodes.right, bbox) : empty_bin();
    var bins = _.map(_.zip(left, right), function(p) {
      var a = p[0];
      var b = p[1];
      return {
        x: a.x,
        dx: a.dx,
        y: a.y + b.y
      };
    });
    return bins;
  } else {
    return empty_bin();
  }
}

function addBins(nodes, dataField, ticks) {
  if (!nodes) return;
  var bins = [];
  for (var i = 0; i < ticks.length - 1; i++) {
    var count = _.filter(nodes.data, function(d) {
      return d[dataField] >= ticks[i] && d[dataField] < ticks[i + 1];
    }).length;
    bins.push({
      x: ticks[i],
      dx: ticks[i + 1] - ticks[i],
      y: count
    });
  }
  nodes.bins = bins;
  addBins(nodes.left, dataField, ticks);
  addBins(nodes.right, dataField, ticks);
}

