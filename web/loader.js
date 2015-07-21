var NUM_LEVELS;
var DATA_DIR = '../data/';

function loadFileList(fileListName, cb) {
  d3.text(fileListName, function(err, file_name_list) {
    var file_names = _.compact(file_name_list.split('\n'));

    var level_groups = _.groupBy(file_names, function(x) {
      return x.match(/(\d+)/)[1];
    });

    var levels = _.sortBy(Object.keys(level_groups), function(g) {
      return Number(g);
    });

    NUM_LEVELS = levels.length;

    datas = [];
    _.each(levels, function(level) {
      var name = level_groups[level][0];
      loadFile(name, Number(level), function(data_obj) {
        datas.push(data_obj);
        if (datas.length == NUM_LEVELS) {
          cb(datas);
        }
      });
    });
  });
}

function loadFile(name, level, cb) {
  d3.text(DATA_DIR + name, function(err, data) {
    if (err) {
      console.log(err);
      return;
    }
    data = convertToEdgeList(data); 
    var data_obj = {
      data: data,
      extent: getExtents(data),
      threshold: level
    };
    cb(data_obj);
  });
}

function getExtents(lines) {
  var xMax = d3.max(lines, function(line) {
    return Math.max(line.x1, line.x2);
  });
  var yMax = d3.max(lines, function(line) {
    return Math.max(line.y1, line.y2);
  });
  var xMin = d3.min(lines, function(line) {
    return Math.min(line.x1, line.x2);
  });
  var yMin = d3.min(lines, function(line) {
    return Math.min(line.y1, line.y2);
  });
  var rounding_factor = 5000000;
  xMax = Math.ceil(xMax / rounding_factor) * rounding_factor;
  xMin = Math.floor(xMin / rounding_factor) * rounding_factor;
  yMax = Math.ceil(yMax / rounding_factor) * rounding_factor;
  yMin = Math.floor(yMin / rounding_factor) * rounding_factor;
  return {
    x: [xMin, xMax],
    y: [yMin, yMax]
  };
}


/*
 * As of right now, the python simplification code emits a file that looks like:
 *
 *   <num_vertices> <num_edges>
 *   vert1_x,vert1_y
 *   ...
 *   vertn_x,vertn_y
 *   edge1_1,edge1_2,type,k1=v1,...,kn=vn
 *   ...
 *   edgen_1,edgen_2,type,k1=v1,...,kn=vn
 *   <Above can be repeated many times>
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
  while (lines.length > 0) {
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
    var ret = {
      x1: Number(point_1[0]),
      y1: Number(point_1[1]),
      x2: Number(point_2[0]),
      y2: Number(point_2[1]),
      type: type
    };

    /*
     * The rest of CSV values are key-value pairs for various data about
     * a match -- it might change in the future, but this should work
     * generally.
     */
    for (var i = 3; i < pieces.length; i++) {
      var kv = pieces[i].split('=');
      var key = kv[0];
      var val = Number(kv[1]);
      ret[key] = val;
    }
    return ret;

  });
}

