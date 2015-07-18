function convertToEdgeList(raw_data) {
  var lines = _.compact(raw_data.split('\n'));
  var meta = lines[0].split(' ');
  var num_vertices = Number(meta[0]);
  var num_edges = Number(meta[1]);

  var data = _.tail(lines);

  var raw_vertices = _.take(data, num_vertices);
  var vertices = verticesFromData(raw_vertices);

  var raw_edges = _.chain(data).drop(num_vertices).take(num_edges).value();
  var edges = inlineEdgesFromRawFormat(raw_edges, vertices);
  return edges;
}

function verticesFromData(data) {
  return _.map(data, function stringToPoint(line) {
    var pieces = line.split(',');
    return {
      x: Number(pieces[0]),
      y: Number(pieces[1])
    };
  });
}

function inlineEdgesFromRawFormat(data, vertices) {
  function stringToEdge(line) {
    var pieces = line.split(',');
    var point_1_index = Number(pieces[0]);
    var point_2_index = Number(pieces[1]);
    var type = pieces[2];
    var point_1 = vertices[point_1_index];
    var point_2 = vertices[point_2_index];
    return {
      x1: point_1.x,
      y1: point_1.y,
      x2: point_2.x,
      y2: point_2.y,
      type: type
    };
  }
  return _.map(data, stringToEdge);
}

