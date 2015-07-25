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
    /* 
     * .ks files are delimited with a combination of tabs and double bars.
     * We convert that to just commas.
     */
    var lines = ks.replace(/\|\|/g, ',')
      .replace(/\t/g, ',')
      .replace(' ', '')
      .split('\n');

    var data = _.chain(lines)
      .compact()
      .filter(function(line) {
        return line[0] !== '#'
      })
      .map(ksLineToSyntenyDot)
      .value();

    function convertLengthToNumber(list) {
      return _.map(list, function(d) {
        d.length = Number(d.length);
        return d;
      });
    }

    function cumulative_counts(data) {
      return _.reduce(data, function(vals, d) {
        vals.push(_.last(vals) + d);
        return vals;
      }, [0]);
    }

    var aNumericLengths = convertLengthToNumber(x_len.lengths);
    var bNumericLengths = convertLengthToNumber(y_len.lengths);
    var xLengths = _.sortBy(aNumericLengths, 'length').reverse();
    var yLengths = _.sortBy(bNumericLengths, 'length').reverse();

    var xNames = _.pluck(xLengths, 'name');
    var yNames = _.pluck(yLengths, 'name');
    var xCumBPCount = cumulative_counts(_.pluck(xLengths, 'length'));
    var yCumBPCount = cumulative_counts(_.pluck(yLengths, 'length'));

    var xShiftScale = d3.scale.ordinal().domain(xNames).range(xCumBPCount);
    var yShiftScale = d3.scale.ordinal().domain(yNames).range(yCumBPCount);

    // Compute absolute BP offset from chromosome and relative offset
    for (var i = 0; i < data.length; i++) {
      var match = data[i];
      var aChrom = match.x_chromosome_id;
      var bChrom = match.y_chromosome_id;
      var xShift = xShiftScale(aChrom);
      var yShift = yShiftScale(bChrom);
      match.nt.x_relative_offset += xShift;
      match.nt.y_relative_offset += yShift;
      match.logks = Math.log(Number(match.ks)) / Math.log(10);
    }

    cb(data, {
      xCumBPCount: xCumBPCount,
      yCumBPCount: yCumBPCount
    });

  });
};

