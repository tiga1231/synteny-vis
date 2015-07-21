function preprocess(datas, aLengths, bLengths) {

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

  controller(datas, {
    xCumBPCount: xCumBPCount,
    yCumBPCount: yCumBPCount
  });
}

