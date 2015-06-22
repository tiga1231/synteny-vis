var q = queue();

switch (window.location.hash) {
  case '#homo_chimp':
  case '#h':
    q = q.defer(d3.json, 'data/homo_chimp.json')
      .defer(d3.json, 'lengths/11691.json')
      .defer(d3.json, 'lengths/25577.json');
    break;
  case '#ecoli':
  case '#e':
    q = q.defer(d3.json, 'data/ecoli.json')
      .defer(d3.json, 'lengths/4241.json')
      .defer(d3.json, 'lengths/4242.json');
    break;
  case '#arabidopsis':
  case '#a':
    q = q.defer(d3.json, 'data/arabidopsis.json')
      .defer(d3.json, 'lengths/16911.json')
      .defer(d3.json, 'lengths/3068.json');
    break;
  case '#maize_sorghum':
  case '#m':
    q = q.defer(d3.json, 'data/maize_sorghum.json')
      .defer(d3.json, 'lengths/6807.json')
      .defer(d3.json, 'lengths/8082.json');
    break;
  default:
    alert("Don't know what '" + window.location.hash + "' is. Loading homo_chimp.json");
    window.location.hash = "#homo_chimp";
    q = q.defer(d3.json, 'data/homo_chimp.json')
      .defer(d3.json, 'lengths/11691.json')
      .defer(d3.json, 'lengths/25577.json');
}

q.await(preprocess);

function preprocess(error, data, aLengths, bLengths) {
  if (error) {
    console.log(error);
    return;
  }

  // Sanity check
  var aID = data[0].header.aID_c.split('_')[0];
  aID = aID.substring(1, aID.length);
  var bID = data[0].header.bID_c.split('_')[0];
  bID = bID.substring(1, bID.length);
  if (aID !== aLengths.id || bID !== bLengths.id) {
    console.log('Something went wrong:');
    console.log('Length files have ID\'s: ' + aLengths.id + ' and ' + bLengths.id);
    console.log('Data file has ID\'s: ' + aID + ' and ' + bID);
    return;
  }

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
    var group = data[i].data;
    var aChrom = group[0].chr1;
    var bChrom = group[0].chr2;
    var xShift = xShiftScale(aChrom);
    var yShift = yShiftScale(bChrom);
    for (var j = 0; j < group.length; j++) {
      var match = group[j];
      match.x1 = Number(match.start1) + xShift;
      match.x2 = Number(match.stop1) + xShift;
      match.y1 = Number(match.start2) + yShift;
      match.y2 = Number(match.stop2) + yShift;
      match.xmin = Math.min(match.x1, match.x2);
      match.xmax = Math.max(match.x1, match.x2);
      match.ymin = Math.min(match.y1, match.y2);
      match.ymax = Math.max(match.y1, match.y2);

      match.logKs = Math.log(Number(match.Ks)) / Math.log(10);
    }
  }

  data = _.flatten(_.pluck(data, 'data'));

  controller(data, {
    xCumBPCount: xCumBPCount,
    yCumBPCount: yCumBPCount
  });
}
