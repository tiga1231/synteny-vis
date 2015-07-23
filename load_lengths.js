function preprocess(data, aLengths, bLengths) {

  // Compute cumulative BP counts
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

  var aNumericLengths = convertLengthToNumber(aLengths.lengths);
  var bNumericLengths = convertLengthToNumber(bLengths.lengths);
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

  controller(data, {
    xCumBPCount: xCumBPCount,
    yCumBPCount: yCumBPCount
  });
}

