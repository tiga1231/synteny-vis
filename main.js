var loadksData = function(ks_filename, x_lengths_file_name, y_lengths_file_name, cb) {

  function ksLineToSyntenyDot(line) {
    var fields = line.split(',');
    var dot = {};
    dot.ks = Number(fields[0]);
    dot.kn = Number(fields[1]);
    dot.x_chromosome_id = fields[3];
    dot.y_chromosome_id = fields[15];
    dot.nt = {};
    dot.ge = {};
    dot.ge.x_relative_offset = fields[10];
    dot.ge.y_relative_offset = fields[22];
    dot.nt.x_relative_offset = Math.round((Number(fields[4]) + Number(fields[5])) / 2);
    dot.nt.y_relative_offset = Math.round((Number(fields[16]) + Number(fields[17])) / 2);
    return dot;
  }

  var q = queue();
  q = q.defer(d3.text, ks_filename)
  q = q.defer(d3.json, x_lengths_file_name);
  q = q.defer(d3.json, y_lengths_file_name);
  q.await(function(err, ks, x_len, y_len) {
    if (err) {
      console.log(err);
      return;
    }

    /* .ks files are delimited with a combination of tabs and double bars. */
    var lines = ks.replace(/\|\|/g, ',').replace(/\t/g, ',').replace(' ', '').split('\n');

    var data = _.chain(lines)
      .compact()
      .reject(function(line) {
        return line[0] === '#'
      })
      .map(ksLineToSyntenyDot)
      .value();

    function lengthsToCumulativeBPCounts(len_list) {
      return _.chain(len_list)
        .sortBy('length')
        .reverse()
        .reduce(function(map, kv) {
          map.total += kv.length;
          map[kv.name] = map.total;
          return map;
        }, {
          total: 0
        })
        .value();
    }

    var xCumLenMap = lengthsToCumulativeBPCounts(x_len);
    var yCumLenMap = lengthsToCumulativeBPCounts(y_len);

    // Compute absolute BP offset from chromosome and relative offset
    for (var i = 0; i < data.length; i++) {
      var dot = data[i];
      var xShift = xCumLenMap[dot.x_chromosome_id];
      var yShift = yCumLenMap[dot.y_chromosome_id];
      dot.nt.x_relative_offset += xShift;
      dot.nt.y_relative_offset += yShift;
      dot.logks = Math.log(Number(dot.ks)) / Math.log(10);
    }

    cb(data, {
      xCumBPCount: xCumLenMap,
      yCumBPCount: yCumLenMap
    });

  });
};

