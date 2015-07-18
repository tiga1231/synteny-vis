var WIDTH = HEIGHT = 300;
var BUFFER = 20
var LINE_WIDTH = 3;
var DATA_DIR = 'data/';


var containers = [];
var levels;
var images = []
var num_lines = []


d3.text('./fileList.txt', function(err, data) {
  var names = _.compact(data.split('\n'));
  var groups = _.groupBy(names, function(x) {
    return x.match(/tri\.(\d+)\.csv/)[1];
  });
  levelsNames = _.sortBy(Object.keys(groups), function(g) {
    return Number(g);
  });
  levels = _.map(levelsNames, Number);
  for (var i = 0; i < levelsNames.length; i++) {
    var level = levelsNames[i];
    var name_set = groups[level];

    (function getFiles(j) {
      var q = queue();
      _.each(name_set, function(name) {
        q = q.defer(d3.text, DATA_DIR + name);
      });
      q.awaitAll(function(err, datas) {
        if (err) {
          console.log(err);
          return;
        }
        datas = _.map(datas, convertToEdgeList);
        datas = _.flatten(datas);
        containers.push(plotLines(datas, j));
      });
    })(i);
  }
});

