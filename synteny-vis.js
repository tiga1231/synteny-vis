'use strict'

function cumulative_counts(data) {
  var ret = [];
  var count = 0;
  for(var i = 0; i < data.length; i++) {
    ret[i] = count;
    count += data[i];
  }
  ret[i] = count;
  return ret;
}

queue()
.defer(d3.json, 'data/homo_chimp.json')
.defer(d3.json, 'lengths/11691.json')
.defer(d3.json, 'lengths/25577.json')
.await(function(error, data, aLengths, bLengths) {
  if(error) { console.log(error); return; }
  
  //Make sure we gave the length files in the right order.
  var aID = data[0].header.aID_c.split('_')[0];
  aID = aID.substring(1, aID.length);
  var bID = data[0].header.bID_c.split('_')[0];
  bID = bID.substring(1, bID.length);
  if(aID !== aLengths.id) {
    console.log('You got the length files backwards, swapping...');
    var t = aLengths;
    aLengths = bLengths;
    bLengths = t;
  }
  if(aID !== aLengths.id || bID !== bLengths.id) {
    console.log('Are you using the right length files?');
    console.log('Length files have ID\'s: ' + aLengths.id 
                  + ' and ' + bLengths.id);
    console.log('Data file has ID\'s: '+aID+' and '+bID);
    return;
  }

  // Compute cumulative BP counts
  var xLengths = _.map(aLengths.lengths, function(d) { 
      return { name: d.name, length: Number(d.length) }; 
  });

  var yLengths = _.map(bLengths.lengths, function(d) { 
      return { name: d.name, length: Number(d.length) }; 
  });

  xLengths.sort(function(a,b) { return a.length < b.length; });
  yLengths.sort(function(a,b) { return a.length < b.length; });

  var xNames = _.pluck(xLengths, 'name');
  var yNames = _.pluck(yLengths, 'name');
  var xCumBPCount = cumulative_counts(_.pluck(xLengths, 'length'));
  var yCumBPCount = cumulative_counts(_.pluck(yLengths, 'length'));

  var xShiftScale = d3.scale.ordinal().domain(xNames).range(xCumBPCount);
  var yShiftScale = d3.scale.ordinal().domain(yNames).range(yCumBPCount);

  // Compute absolute BP offset from chromosome and relative offset
  for(var i = 0; i < data.length; i++) {
    var group = data[i].data;
    var aChrom = group[0].chr1;
    var bChrom = group[0].chr2;
    var xShift = xShiftScale(aChrom);
    var yShift = yShiftScale(bChrom);
    for(var j = 0; j < group.length; j++) {
      var match = group[j];
      match.adjustedStart1 = Number(match.start1) + xShift;
      match.adjustedStop1 = Number(match.stop1) + xShift;
      match.adjustedStart2 = Number(match.start2) + yShift;
      match.adjustedStop2 = Number(match.stop2) + yShift;
    }
  }
  // Combine all chunks
  data = _.flatten(_.pluck(data, 'data'));

  var xTotalBPs = _.last(xCumBPCount);
  var yTotalBPs = _.last(yCumBPCount);
  var width = 600;
  var height = width * (yTotalBPs / xTotalBPs);

  var xExtent = [0, xTotalBPs];
  var yExtent = [0, yTotalBPs];
  var xScale = d3.scale.linear().domain(xExtent).range([0, width]);
  var yScale = d3.scale.linear().domain(yExtent).range([height, 0]);

  var zoom = d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1,10000]).on('zoom', zoomed);

  var brush = d3.svg.brush().x(xScale).y(yScale)
    .on('brush', function() {
      updatePlot(brush.extent(), false);
    })
    .on('brushend', function() {
      if(brush.empty()) {
        updatePlot([[0,0],[1e15,1e15]], true);
      } else {
        updatePlot(brush.extent(), true);
      }
    });

  var brushSel = d3.select('body').append('svg')
    .attr({width: width, height: height}).classed('main', true)
    .call(zoom).on('mousedown.zoom', null); //disable panning
  var svg = brushSel.call(brush).append('g');
  

  var plotWidth = 600, plotHeight = 600;
  var plot = d3.select('body').append('svg').classed('plot', true)
    .attr({width: plotWidth, height: plotHeight});

  // Grid lines
  svg.selectAll('.grid-vertical')
    .data(xCumBPCount).enter().append('path')
    .classed('grid-vertical', true)
    .attr('d', function(d) { 
      var x = xScale(d);
      var y1 = 0, y2 = height;
      return 'M ' + x + ' ' + y1 + ' L ' + x + ' ' + y2;
    });

  svg.selectAll('.grid-horizontal')
    .data(yCumBPCount).enter().append('path')
    .classed('grid-horizontal', true)
    .attr('d', function(d) { 
      var y = yScale(d);
      var x1 = 0, x2 = width;
      return 'M ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y;
    });

  // Data
  var dataSel = svg.selectAll('.synteny').data(data).enter()
    .append('line')
    .classed('synteny', true)
    .attr('x1', function(d) { return xScale(d.adjustedStart1); })
    .attr('y1', function(d) { return yScale(d.adjustedStart2); })
    .attr('x2', function(d) { return xScale(d.adjustedStop1); })
    .attr('y2', function(d) { return yScale(d.adjustedStop2); });

  var strokeWidth = 3;
  var lastScale = strokeWidth
  function zoomed() {

    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");

    var modifiedXExtent = xScale.domain(); 
    var modifiedYExtent = yScale.domain(); 
    var screenWidth = modifiedXExtent[1] - modifiedXExtent[0]; // Ratio is same using x or y
    var original = xExtent[1] - xExtent[0];
    var scaling = strokeWidth * screenWidth / original;
    var gridScaling = screenWidth / original;

    /* 
     * Two optimizations for semantic zooming:
     *  - Only update the stroke-width if there is a large difference 
     *    between current width and ideal width. 
     *    This lowers the number of updates that are necessary at low 
     *    magnification, which are the most expensive because...
     *  - We only update the svg elements that are visible.
     *
     * The parameter k controls how extreme the first optimization is.
     * k = 1 means that 'large' means roughly an integer difference,
     * k = 2 means that 'large' means roughly a half integer difference, etc.
     * Bigger k, smoother. Smaller k, faster.
     */
    var k = 3 
    if(Math.round(k/scaling) !== Math.round(k/lastScale)) {
      lastScale = scaling;
      var xMax = modifiedXExtent[1], xMin = modifiedXExtent[0];
      var yMax = modifiedYExtent[1], yMin = modifiedYExtent[0];
      dataSel
        .filter(function(d) { return d.adjustedStart1 < xMax && d.adjustedStart1 > xMin && d.adjustedStart2 < yMax && d.adjustedStart2 > yMin; })
        .style('stroke-width', scaling);
    }
    // There are so few grid lines, we can afford to update all of them
    // all of the time.
    d3.selectAll('.grid-horizontal').style('stroke-width', gridScaling);
    d3.selectAll('.grid-vertical').style('stroke-width', gridScaling);

    // now that's an ugly hack: redraw the brush with the new scale and old extent
    brushSel.call(brush.x(xScale).y(yScale).extent(brush.extent()));
  }


  var field = 'Kn';
  var numTicks = 20;
  var margin = 50;

  plot.selectAll('.dataBars').data(d3.range(numTicks)).enter()
    .append('rect').classed('dataBars', true);

  plot.append('text')
    .attr('x', 2 * plotHeight / 3)
    .attr('width', plotHeight / 3)
    .attr('y', 50)
    .attr('height', 50)
    .classed('textInPlot', true)
    .text(field);

  function plotBrushBrush() { // This function name is great
    var e = plotBrush.extent();
    // Rounding to include entire histogram bars at once
    var min = Math.floor(numTicks * e[0][0]) / numTicks;
    var max = Math.ceil(numTicks * e[1][0]) / numTicks;
    svg.selectAll('.synteny').classed('selected', function(d) {
      return d[field] <= max && d[field] >= min;
    });
    plot.selectAll('.dataBars').attr('fill', function(d) {
      return (d.x + d.dx <= max && d.x >= min) ? 'red' : 'steelblue';
    });
    // Force the brush to occupy the entire height of the plot
    var newExtent =[[e[0][0], 0], [e[1][0], yPlotScale.invert(plotHeight - margin)]];
    plotBrush.extent(newExtent);
    plot.select('.extent')
      .attr('x', xPlotScale(min))
      .attr('width', xPlotScale(max - min) - margin)
      .attr('y', margin)
      .attr('height', plotHeight - 2*margin)
  }

  var lastYExtent = [0, data.length/4]; // Default--no reason why
  var plotBrush = d3.svg.brush().on('brush', plotBrushBrush);
  var xPlotScale, yPlotScale;

  function updatePlot(extent, shouldRescaleYAxis) {
    var e = extent;

    var filteredData = _.chain(data).filter(function(d) { 
        return d.adjustedStart1 > e[0][0] && d.adjustedStart1 < e[1][0] &&
            d.adjustedStart2 > e[0][1] && d.adjustedStart2 < e[1][1];
        }).pluck(field).value();

    var plotData = d3.layout.histogram()
      .bins(d3.scale.linear().ticks(numTicks))(filteredData);

    xPlotScale = d3.scale.linear()
      .range([margin, plotWidth - margin]);
    yPlotScale = d3.scale.linear()
      .domain(lastYExtent)
      .range([plotHeight - margin, margin]);
    var xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom');
    var yAxis = d3.svg.axis().scale(yPlotScale).orient('left');

    plotBrush.x(xPlotScale).y(yPlotScale);
    plot.call(plotBrush);

    plot.selectAll('.dataBars').data(plotData)
      .attr('x', function(d) { return xPlotScale(d.x); })
      .attr('width', function(d) { return xPlotScale(d.dx) - margin; })
      .attr('y', function(d) { return yPlotScale(d.y); })
      .attr('height', function(d) { return plotHeight - margin - yPlotScale(d.y); })
      .attr('fill', 'steelblue');

    plotBrushBrush();

    plot.selectAll('.xAxis').remove();
    plot.selectAll('.yAxis').remove();

    plot.append('g')
      .attr('transform', 'translate(0,' + (plotHeight - 50) + ')') 
      .classed('xAxis', true).call(xAxis);
    var yAxisSel = plot.append('g')
      .attr('transform', 'translate(50,0)') 
      .classed('yAxis', true).call(yAxis);

    if(shouldRescaleYAxis) {
      var transitionLength = 250;
      lastYExtent = [0, 3/2*d3.max(_.pluck(plotData, 'y'))];
      yPlotScale = d3.scale.linear()
        .domain(lastYExtent)
        .range([plotHeight - margin, margin]);
      yAxis.scale(yPlotScale);
      yAxisSel.transition().duration(transitionLength).call(yAxis);
      plot.selectAll('.dataBars').transition().duration(transitionLength)
        .attr('x', function(d) { return xPlotScale(d.x); })
        .attr('width', function(d) { return xPlotScale(d.dx) - margin; })
        .attr('y', function(d) { return yPlotScale(d.y); })
        .attr('height', function(d) { return plotHeight - margin - yPlotScale(d.y); });
    } 
  }
});
