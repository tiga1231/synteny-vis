loadFileList('../fileList.txt', function(datas) {
  _.each(datas, function(data) {
    _.each(data.data, function(d) {
      d.logks = Math.log(d.ks) / Math.log(10);
      d.xmin = Math.min(d.x1, d.x2);
      d.xmax = Math.max(d.x1, d.x2);
      d.ymin = Math.min(d.y1, d.y2);
      d.ymax = Math.max(d.y1, d.y2);
    });
  });

  datas = _.map(datas, function(data) {
    data.data = _.filter(data.data, function(d) {
      return isFinite(d.logks); 
    });
    return data;
  });

  var q = queue();
  q = q.defer(d3.json, '../lengths/11691.json');
  q = q.defer(d3.json, '../lengths/25577.json');
  q.await(function(err, a, b) {
    if (err) {
      console.log(err);
      return;
    }
    preprocess(datas, a, b);
  });
});

