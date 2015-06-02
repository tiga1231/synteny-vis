function cumulative_counts(data) {
  var ret = [];
  var count = 0;
  for (var i = 0; i < data.length; i++) {
    ret[i] = count;
    count += data[i];
  }
  ret[i] = count;
  return ret;
}

var q = queue();

switch (window.location.hash) {
  case '#homo_chimp':
    q = q.defer(d3.json, 'data/homo_chimp.json')
      .defer(d3.json, 'lengths/11691.json')
      .defer(d3.json, 'lengths/25577.json');
    break;
  case '#ecoli':
    q = q.defer(d3.json, 'data/ecoli.json')
      .defer(d3.json, 'lengths/4241.json')
      .defer(d3.json, 'lengths/4242.json');
    break;
  case '#arabidopsis':
    q = q.defer(d3.json, 'data/arabidopsis.json')
      .defer(d3.json, 'lengths/16911.json')
      .defer(d3.json, 'lengths/3068.json');
    break;
  default:
    alert("Don't know what '" + window.location.hash + "' is. Loading homo_chimp.json");
    q = q.defer(d3.json, 'data/homo_chimp.json')
      .defer(d3.json, 'lengths/11691.json')
      .defer(d3.json, 'lengths/25577.json');
}

q.await(function(error, data, aLengths, bLengths) {
  if (error) {
    console.log(error);
    return;
  }

  //Make sure we gave the length files in the right order.
  var aID = data[0].header.aID_c.split('_')[0];
  aID = aID.substring(1, aID.length);
  var bID = data[0].header.bID_c.split('_')[0];
  bID = bID.substring(1, bID.length);
  if (aID !== aLengths.id) {
    console.log('You got the length files backwards, swapping...');
    var t = aLengths;
    aLengths = bLengths;
    bLengths = t;
  }
  if (aID !== aLengths.id || bID !== bLengths.id) {
    console.log('Are you using the right length files?');
    console.log('Length files have ID\'s: ' + aLengths.id +
      ' and ' + bLengths.id);
    console.log('Data file has ID\'s: ' + aID + ' and ' + bID);
    return;
  }

  // Compute cumulative BP counts
  var xLengths = _.map(aLengths.lengths, function(d) {
    return {
      name: d.name,
      length: Number(d.length)
    };
  });

  var yLengths = _.map(bLengths.lengths, function(d) {
    return {
      name: d.name,
      length: Number(d.length)
    };
  });

  xLengths.sort(function(a, b) {
    return a.length < b.length ? 1 : -1;
  });
  yLengths.sort(function(a, b) {
    return a.length < b.length ? 1 : -1;
  });

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
      match.adjustedStart1 = x1 = Number(match.start1) + xShift;
      match.adjustedStop1 = x2 = Number(match.stop1) + xShift;
      match.adjustedStart2 = y1 = Number(match.start2) + yShift;
      match.adjustedStop2 = y2 = Number(match.stop2) + yShift;
      match.xmin = Math.min(x1, x2);
      match.xmax = Math.max(x1, x2);
      match.ymin = Math.min(y1, y2);
      match.ymax = Math.max(y1, y2);

      match.slope = (y2 - y1) / (x2 - x1);
    }
  }

  data = _.pluck(data, 'data');
  data = _.flatten(data);
  data = _.pluck(data, 'slope');

  var width = height = 600;
  var margin = 50;

  var xscale = d3.scale.linear()
    .domain([-5, 5])
    .range([margin, width - margin]);

  var plotData = d3.layout.histogram().bins(xscale.ticks(40))(data);
  console.log(plotData);

  var yscale = d3.scale.linear()
      .domain(d3.extent(_.pluck(plotData, 'y')))
      .range([height - margin, margin]);

  var xAxis = d3.svg.axis().scale(xscale).orient('bottom');
  var yAxis = d3.svg.axis().scale(yscale).orient('left');

   var svg = d3.select('body').append('svg')
   .attr('width', width)
   .attr('height', height);
    
    svg.selectAll('rect').data(plotData)
      .enter()
      .append('rect')
      .attr('x', function(d) {
        return xscale(d.x);
      })
      .attr('width', function(d) {
        return (xscale(d.x + d.dx) - xscale(d.x));
      })
      .attr('y', function(d) {
        return yscale(d.y);
      })
      .attr('height', function(d) {
        return height - yscale(d.y) - margin;
      });

    svg.append('g')
      .attr('transform', 'translate(0,' + (height - 50) + ')')
      .classed('xAxis', true).call(xAxis);
    var yAxisSel = svg.append('g')
      .attr('transform', 'translate(50,0)')
      .classed('yAxis', true).call(yAxis);
});

