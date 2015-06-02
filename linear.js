function dot(a, b) {
  if (a.length !== b.length) throw Error('dot lengths');
  var d = 0;
  for (var i = 0; i < a.length; i++) {
    d += a[i] * b[i];
  }
  return d;
}

function inverse2x2(m) {
  var a = m[0][0];
  var b = m[0][1];
  var c = m[1][0];
  var d = m[1][1];
  var det = a * d - b * c;
  if (det === 0) {
    throw Error('singular');
  }
  return [
    [d / det, -b / det],
    [-c / det, a / det]
  ];
}

function sum(x) {
  var ret = 0;
  for (var i = 0; i < x.length; i++) {
    ret += x[i];
  }
  return ret;
}

function regression_line(nodes) {
  var n = nodes.length;
  var x = _.pluck(nodes, '0');
  var y = _.pluck(nodes, '1');

  var t = [
    [n, sum(x)],
    [sum(x), dot(x, x)]
  ];
  var it = inverse2x2(t);

  var t1 = [];
  for (var i = 0; i < n; i++) {
    t1.push([
      it[0][0] + x[i] * it[0][1],
      it[1][0] + x[i] * it[1][1]
    ]);
  }

  var ret = [0, 0];
  for (i = 0; i < n; i++) {
    ret[0] += t1[i][0] * y[i];
    ret[1] += t1[i][1] * y[i];
  }
  return ret;
}

