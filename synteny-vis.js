var syntenyLineStrokeWidth = 3;
var gridLineStrokeWidth = 1;
var numHistogramTicks = 50;
var histogramYScaleTransitionLength = 750;


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
    q = q.defer(d3.json, 'data/homo_chimp.json')
      .defer(d3.json, 'lengths/11691.json')
      .defer(d3.json, 'lengths/25577.json');
}

q.await(function(error, data, aLengths, bLengths) {
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

      match.logKs = Math.log(Number(match.Ks));
    }
  }

  var xTotalBPs = _.last(xCumBPCount);
  var yTotalBPs = _.last(yCumBPCount);
  var width = 600;
  var height = width * (yTotalBPs / xTotalBPs);

  var field = 'logKs';

  // Combine all chunks
  data = _.flatten(_.pluck(data, 'data'));
  data = _.filter(data, function(d) {
    return isFinite(d[field]);
  });

  var BPPerPixel = xTotalBPs / width;
  var base = 4;
  var numLevels = Math.ceil(Math.log(BPPerPixel) / Math.log(base));
  var levels = _.map(_.range(numLevels), function(i) {
    return BPPerPixel / Math.pow(base, i);
  });

  var merged = merge(data, field, levels);
  var bvh_nodes = bvh_build(data);
  var prevMergeIndex = 0;
  data = merged[0].sets;

  var xExtent = [0, xTotalBPs];
  var yExtent = [0, yTotalBPs];
  var xScale = d3.scale.linear().domain(xExtent).range([0, width]);
  var yScale = d3.scale.linear().domain(yExtent).range([height, 0]);
  var xScaleOriginal = xScale.copy();
  var yScaleOriginal = yScale.copy();

  var zoom = d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 10000]).on('zoom', zoomed);

  // Can be used as array or by bvh/merge stuff
  var wholePlot = {
    0: [0, 0],
    1: [1e15, 1e15],
    xmin: 0,
    ymin: 0,
    xmax: 1e15,
    ymax: 1e15
  };

  function resizeBrushBoundary() {
    var scaling = zoom.scale();
    var corners = ['.nw', '.ne', '.se', '.sw'];
    var vertical = ['.e', '.w'];
    var horizontal = ['.n', '.s'];
    var horizontalRescale = _.union(corners, vertical);
    var verticalRescale = _.union(corners, horizontal);

    _.map(horizontalRescale, function(name) {
      d3.select('.resize' + name).select('rect')
        .attr('width', 6 / scaling).attr('x', -3 / scaling);
    });

    _.map(verticalRescale, function(name) {
      d3.select('.resize' + name).select('rect')
        .attr('height', 6 / scaling).attr('y', -3 / scaling);
    });
  }

  function mainBrush() {
    if(brush.empty()) return;
    var e = brush.extent();
    e = [
      [xScaleOriginal.invert(e[0][0]), yScaleOriginal.invert(e[1][1])],
      [xScaleOriginal.invert(e[1][0]), yScaleOriginal.invert(e[0][1])],
    ];
    svg.selectAll('.synteny').classed('unselectedByMain', function(d) {
      return d.xmin > e[1][0] || d.xmax < e[0][0] ||
        d.ymin > e[1][1] || d.ymax < e[0][1];
    });
    console.log(e[0], e[1]);
    updatePlot(brush.extent(), false);
    resizeBrushBoundary();
  }

  function mainBrushEnd() {
    if (brush.empty()) {
      svg.selectAll('.synteny').classed('unselectedByMain', false);
      updatePlot(wholePlot, true);
    } else {
      updatePlot(brush.extent(), true);
    }
  }

  var brush = d3.svg.brush()
    .x(d3.scale.linear().domain([0, width]).range([0, width]))
    .y(d3.scale.linear().domain([0, height]).range([0, height]))
    .on('brush', mainBrush)
    .on('brushend', mainBrushEnd);

  var svgPre = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    .classed('main', true)
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning
  var svg = svgPre.append('g').attr('id', 'data-group');

  var plotWidth = 600;
  var plotHeight = 600;
  var plot = d3.select('body').append('svg').classed('plot', true)
    .attr({
      width: plotWidth,
      height: plotHeight
    });

  // Grid lines
  svg.selectAll('.grid-vertical')
    .data(xCumBPCount).enter().append('path')
    .classed('grid-vertical', true)
    .attr('d', function(d) {
      var x = xScale(d);
      var y1 = 0;
      var y2 = height;
      return 'M ' + x + ' ' + y1 + ' L ' + x + ' ' + y2;
    });

  svg.selectAll('.grid-horizontal')
    .data(yCumBPCount).enter().append('path')
    .classed('grid-horizontal', true)
    .attr('d', function(d) {
      var y = yScale(d);
      var x1 = 0;
      var x2 = width;
      return 'M ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y;
    });


  var dataExtent = d3.extent(bvh_find(bvh_nodes, wholePlot), function(d) {
    return d[field];
  });
  var colorScale = d3.scale.linear().domain(dataExtent)
    .range(["red", "green"]);

  var dataSel;

  function setSyntenyData(lines) {
    var tempSel = svg.selectAll('.synteny').data(lines);
    tempSel.enter().append('line').classed('synteny', true);
    tempSel
      .attr('x1', function(d) {
        return xScaleOriginal(d.x1);
      })
      .attr('y1', function(d) {
        return yScaleOriginal(d.y1);
      })
      .attr('x2', function(d) {
        return xScaleOriginal(d.x2);
      })
      .attr('y2', function(d) {
        return yScaleOriginal(d.y2);
      })
      .style('stroke', function(d) {
        return colorScale(d.summary);
      })
      .classed('unselectedByMain', false)
      .classed('unselectedByHistogram', false);

    tempSel.exit().remove();
    dataSel = tempSel;
  }

  // Data
  setSyntenyData(data);

  svgPre
    .append('g').attr('id', 'brush-group')
    .call(brush);

  function updateMergeLevel(s) {
    var BP = BPPerPixel * s;
    var mergeIndex = 0;
    for (var i = levels.length - 1; i >= 0; i--) {
      if (BP < levels[i]) {
        mergeIndex = i;
        break;
      }
    }
    if (mergeIndex !== prevMergeIndex) {
      prevMergeIndex = mergeIndex;
      data = merged[mergeIndex].sets;
      setSyntenyData(data);

      // Update brushes
      plotBrushBrush();
      mainBrush();

      return true;
    }
    return false;
  }

  var lastScale = 1;

  function zoomed() {
    var t = d3.event.translate;
    var s = d3.event.scale;
    t[0] = Math.min(0, Math.max(-width * s + width, t[0]));
    t[1] = Math.min(0, Math.max(-height * s + height, t[1]));
    // prevents the translate from growing large. This way, you don't 
    // have to "scroll back" onto the canvas if you pan past the edge.
    zoom.translate(t);

    d3.select('#brush-group')
      .attr("transform", "translate(" + t + ")scale(" + s + ")");
    d3.select('#data-group')
      .attr("transform", "translate(" + t + ")scale(" + s + ")");

    var mergeUpdate = updateMergeLevel(1 / s);

    /* 
     * We only update the svg elements that are visible.
     */
    var e = 1.e7
    var xMax = xScale.domain()[1] + e;
    var xMin = xScale.domain()[0] - e;
    var yMax = yScale.domain()[1] + e;
    var yMin = yScale.domain()[0] - e;

    dataSel
      .filter(function(d) {
        return !(d.xmin > xMax || xMin > d.xmax ||
          d.ymin > yMax || yMin > d.ymin);
      })
      .style('stroke-width', syntenyLineStrokeWidth / s);

    svg.selectAll('.grid-horizontal')
      .style('stroke-width', gridLineStrokeWidth / s);
    svg.selectAll('.grid-vertical')
      .style('stroke-width', gridLineStrokeWidth / s);
  }

  plot.append('text')
    .attr('x', 2 * plotHeight / 3)
    .attr('width', plotHeight / 3)
    .attr('y', 50)
    .attr('height', 50)
    .classed('textInPlot', true)
    .text(field);

  function plotBrushBrush() {
    if (plotBrush.empty()) return;
    var e = plotBrush.extent();
    svg.selectAll('.synteny')
      .classed('unselectedByHistogram', function(d) {
        return d.summary > e[1] || d.summary < e[0];
      });
  }

  function plotBrushEnd() {
    if (plotBrush.empty()) {
      svg.selectAll('.synteny').classed('unselectedByHistogram', false);
    }
  }

  var plotBrush = d3.svg.brush()
    .on('brush', plotBrushBrush)
    .on('brushend', plotBrushEnd);

  var margin = 50;
  var lastYExtent = [0, bvh_nodes.data.length];
  var xPlotScale = d3.scale.linear()
    .domain(dataExtent)
    .range([margin, plotWidth - margin]);
  var yPlotScale;

  plot.selectAll('.dataBars')
    .data(xPlotScale.ticks(numHistogramTicks).slice(1))
    .enter()
    .append('rect').classed('dataBars', true);
  computeBins(bvh_nodes, field, xPlotScale.ticks(numHistogramTicks));

  function updatePlot(extent, shouldRescaleYAxis) {
    var e = extent;
    e = [
      [xScaleOriginal.invert(e[0][0]), yScaleOriginal.invert(e[1][1])],
      [xScaleOriginal.invert(e[1][0]), yScaleOriginal.invert(e[0][1])],
    ];

    var bbox = {
      xmin: e[0][0],
      ymin: e[0][1],
      xmax: e[1][0],
      ymax: e[1][1]
    };

    var filteredData = bvh_find_summary(bvh_nodes, bbox);

    xPlotScale = d3.scale.linear()
      .domain(dataExtent)
      .range([margin, plotWidth - margin]);
    yPlotScale = d3.scale.linear()
      .domain(lastYExtent)
      .range([plotHeight - margin, margin]);

    var xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom');
    var yAxis = d3.svg.axis().scale(yPlotScale).orient('left');

    plotBrush.x(xPlotScale);
    plot.selectAll('#plotbrush-group').remove();
    var gBrush = plot.append('g').attr('id', 'plotbrush-group')
      .attr('transform', 'translate(0,' + margin + ')')
      .call(plotBrush);
    gBrush.selectAll('rect').attr('height', plotHeight - 2 * margin);

    plot.selectAll('.dataBars').data(filteredData)
      .attr('x', function(d) {
        return xPlotScale(d.x);
      })
      .attr('width', function(d) {
        return (xPlotScale(d.x + d.dx) - xPlotScale(d.x));
      })
      .attr('y', function(d) {
        return yPlotScale(d.y);
      })
      .attr('height', function(d) {
        return plotHeight - margin - yPlotScale(d.y);
      })
      .attr('fill', function(d) {
        return colorScale(d.x + d.dx / 2);
      });

    plotBrushBrush();

    plot.selectAll('.xAxis').remove();
    plot.selectAll('.yAxis').remove();

    plot.append('g')
      .attr('transform', 'translate(0,' + (plotHeight - 50) + ')')
      .classed('xAxis', true).call(xAxis);
    var yAxisSel = plot.append('g')
      .attr('transform', 'translate(50,0)')
      .classed('yAxis', true).call(yAxis);

    if (shouldRescaleYAxis) {
      lastYExtent = [0, 3 / 2 * d3.max(_.pluck(filteredData, 'y'))];
      yPlotScale = d3.scale.linear()
        .domain(lastYExtent)
        .range([plotHeight - margin, margin]);
      yAxis.scale(yPlotScale);
      yAxisSel.transition()
        .duration(histogramYScaleTransitionLength)
        .call(yAxis);
      plot.selectAll('.dataBars').transition()
        .duration(histogramYScaleTransitionLength)
        .attr('x', function(d) {
          return xPlotScale(d.x);
        })
        .attr('width', function(d) {
          return (xPlotScale(d.x + d.dx) - xPlotScale(d.x));
        })
        .attr('y', function(d) {
          return yPlotScale(d.y);
        })
        .attr('height', function(d) {
          return plotHeight - margin - yPlotScale(d.y);
        });
    }
  }

  updatePlot(wholePlot, true); // Initialize histogram

  // zoom/pan switching
  d3.selectAll("#mouse-options input[name=mouse-options]")
    .on("change", function() {
      if (this.value === 'pan') {
        d3.select('#brush-group').on('mousedown.brush', null);
        d3.select('#zoom-group').call(zoom);
        d3.select('#brush-group').style('pointer-events', null);
        d3.select('#zoom-group').style('pointer-events', 'all');
      } else if (this.value === 'brush') {
        d3.select('#brush-group').call(brush);
        d3.select('#brush-group').style('pointer-events', 'all');
        d3.select('#zoom-group').on('mousedown.zoom', null);
      }
    });
});

