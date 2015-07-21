var FIELD = 'ks';
var WIDTH = HEIGHT = 400;
var BUFFER = 20
var LINE_WIDTH = 5;

var colorScale;

function makePlotLineWrapper(cb) {
  return function(datas) {
    colorScale = d3.scale.log()
      .domain(d3.extent(_.chain(datas[0].data).pluck(FIELD).filter(function(x) {
        return x > 0;
      }).value()))
      .range(['red', 'green']);

    datas = _.sortBy(datas, function(data) {
      return Number(data.threshold);
    });

    _.each(datas, function(data_obj) {
      var div = d3.select('body').append('div').classed('wrapper', true);
      cb(data_obj.data, data_obj.extent, data_obj.threshold, div);
    });
  };
}

switch (window.location.hash) {
  default: alert('Redirecting to svg');
  window.location.hash = '#svg';
  case '#svg':
    loadFileList('../fileList.txt', makePlotLineWrapper(plotLinesSvg));
    break;
  case '#canvas':
    loadFileList('../fileList.txt', makePlotLineWrapper(plotLinesCanvas));
    break;
}

