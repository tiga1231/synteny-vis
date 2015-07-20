/*
 * As of right now, the python simplification code emits a file that looks like:
 *
 *   <num_vertices> <num_headers>
 *   vert1_x,vert1_y
 *   ...
 *   vertn_x,vertn_y
 *   edge1_1,edge1_2
 *   ...
 *   edgen_1,edgen_2
 *
 *   The d3 code was originally written to handle objects with x1, y1, x2, y2,
 *   and type fields, so we convert to that form here. It might make sense to
 *   inline this, but I don't know if the format will change again so leaving
 *   the raw-data-to-object code separate is fine for now.
 */
function convertToEdgeList(raw_data) {

  // split leaves an empty string at the end if raw_data ends in a newline,
  // so we _.compact to discard it.
  var lines = _.compact(raw_data.split('\n'));

  var edges = []
  while(lines.length > 0) {
    var meta = _.head(lines).split(' ');
    var data = _.tail(lines);

    var num_vertices = Number(meta[0]);
    var num_edges = Number(meta[1]);

    var raw_vertices = _.take(data, num_vertices);
    var vertices = verticesFromCSV(raw_vertices);

    var raw_edges = _.chain(data).drop(num_vertices).take(num_edges).value();

    edges = edges.concat(inlineEdgesFromRawFormat(raw_edges, vertices));
    lines = _.chain(data).drop(num_vertices).drop(num_edges).value();
  }
  return edges;
}

/*
 * Extract x and y coordinates from csv format lines
 */
function verticesFromCSV(data) {
  return _.map(data, function(line) {
    return line.split(',');
  });
}

/*
 * Using the array of vertices we just made, 1) convert CSV lines to vertex 
 * coordinates, and 2) produce a final array of (x1, y1, x2, y2, type) objects.
 */
function inlineEdgesFromRawFormat(data, vertices) {
  return _.map(data, function(line) {
    var pieces = line.split(',');
    var point_1_index = Number(pieces[0]);
    var point_2_index = Number(pieces[1]);
    var type = pieces[2];
    var point_1 = vertices[point_1_index];
    var point_2 = vertices[point_2_index];
    return {
      x1: Number(point_1[0]),
      y1: Number(point_1[1]),
      x2: Number(point_2[0]),
      y2: Number(point_2[1]),
      type: type
    };
  });
}

