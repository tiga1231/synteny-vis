function build_bvh(nodes, dataField) {
  if (nodes.length === 0) {
    return null;
  }

  if (nodes.length === 1) {
    var node = nodes[0];
    return {
      "xmin": node.adjustedStart1,
      "xmax": node.adjustedStart1,
      "ymin": node.adjustedStart2,
      "ymax": node.adjustedStart2,
      "data": [node[dataField]],
      "left": null,
      "right": null
    };
  }

  var xmin = d3.min(nodes, function(d) {
    return Math.min(d.adjustedStart1, d.adjustedStop1);
  });
  var xmax = d3.max(nodes, function(d) {
    return Math.max(d.adjustedStart1, d.adjustedStop1);
  });
  var ymin = d3.min(nodes, function(d) {
    return Math.min(d.adjustedStart2, d.adjustedStop2);
  });
  var ymax = d3.max(nodes, function(d) {
    return Math.max(d.adjustedStart2, d.adjustedStop2);
  });

  var xwidth = xmax - xmin;
  var ywidth = ymax - ymin;

  var pieces;
  if (xwidth > ywidth) {
    var middle = (xmax + xmin) / 2;
    pieces = _.partition(nodes, function(d) {
      return Math.max(d.adjustedStart1, d.adjustedStop1) < middle;
    });
  } else {
    var middle = (ymax + ymin) / 2;
    pieces = _.partition(nodes, function(d) {
      return Math.max(d.adjustedStart2, d.adjustedStop2) < middle;
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

