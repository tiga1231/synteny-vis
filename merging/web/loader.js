// These are used by the plot_* files. Its awkward to put them here,
// but this way they are only in one spot.
var WIDTH = HEIGHT = 300;
var BUFFER = 20
var LINE_WIDTH = 3;

var containers = []; // used for synchronized zooming, currently only svg
var images = []; // used for image difference computations (canvas)
var NUM_LEVELS;


var DATA_DIR = 'data/';


d3.text('./fileList.txt', function(err, file_name_list) {
  var file_names = _.compact(file_name_list.split('\n'));

  var level_groups = _.groupBy(file_names, function(x) {
    return x.match(/(\d+)\.combined\.csv/)[1];
  });

  var levels = _.sortBy(Object.keys(level_groups), function(g) {
    return Number(g);
  });

  NUM_LEVELS = levels.length;

  _.each(levels, function(level) {
    var name_set = level_groups[level];
    loadFileSet(name_set, level);
  });
});

function loadFileSet(name_set, level) {
  // We do this here to enforce plot ordering
  var div = d3.select('body').append('div').classed('wrapper', true);
  var q = queue();

  _.each(name_set, function(name) {
    q = q.defer(d3.text, DATA_DIR + name);
  });

  q.awaitAll(function(err, datas) {
    if (err) {
      console.log(err);
      return;
    }
    datas = _.map(datas, convertToEdgeList); // inline_edges.js
    datas = _.flatten(datas);
    containers.push(plotLines(datas, getExtents(datas), level, div));
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
  return {
    x: [xMin, xMax],
    y: [yMin, yMax]
  };
}

