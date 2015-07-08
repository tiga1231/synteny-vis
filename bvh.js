/* 
 * bvh_build expects a data array with elements that have the
 * following fields:
 *
 *  xmin, xmax, ymin, ymax
 */
function bvh_build(nodes) {
  var xmin = _.chain(nodes).pluck('xmin').min().value();
  var xmax = _.chain(nodes).pluck('xmax').max().value();
  var ymin = _.chain(nodes).pluck('ymin').min().value();
  var ymax = _.chain(nodes).pluck('ymax').max().value();

  var xwidth = xmax - xmin;
  var ywidth = ymax - ymin;

  var pieces;
  if (xwidth > ywidth) {
    var middle = (xmax + xmin) / 2;
    pieces = _.partition(nodes, function(d) {
      return d.xmax < middle;
    });
  } else {
    var middle = (ymax + ymin) / 2;
    pieces = _.partition(nodes, function(d) {
      return d.ymax < middle;
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

function emptyBins(bins) {
  return _.map(bins, function(d) {
    return {
      x: d.x,
      dx: d.dx,
      y: 0
    };
  });
}

function addBins(a, b) {
  return _.chain(a.length).range()
    .map(function(i) {
      return {
        x: a[i].x,
        dx: a[i].dx,
        y: a[i].y + b[i].y
      };
    }).value();
}

function bvh_find_summary(nodes, bbox) {
  if (containedIn(nodes, bbox)) {
    return nodes.bins;
  } else if (intersect(nodes, bbox)) {
    var left = nodes.left ? bvh_find_summary(nodes.left, bbox) : emptyBins(nodes.bins);
    var right = nodes.right ? bvh_find_summary(nodes.right, bbox) : emptyBins(nodes.bins);
    return addBins(left, right);
  } else {
    return emptyBins(nodes.bins);
  }
}

function computeBins(nodes, dataField, ticks) {
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
  computeBins(nodes.left, dataField, ticks);
  computeBins(nodes.right, dataField, ticks);
}
