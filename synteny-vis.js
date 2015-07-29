var SYNTENY_MARGIN = 50; /* Padding around synteny plot for axes */
var HISTOGRAM_MARGIN = 40; /* Padding around histogram */
var HISTOGRAM_Y_SCALE_TRANS_LEN = 750; /* How long a y-axis histogram rescale takes */
var COLOR_TRANS_LEN = 500; /* How long a color scale transition takes */
var NUM_HISTOGRAM_TICKS = 80;

var globalColorScale;

function getComputedAttr(element, attr) {
  var computed = window.getComputedStyle(element)[attr];
  return parseInt(computed, 10);
}

function controller(dataObj) {
  /* zoom/pan switching */
  d3.selectAll("#mouse-options input[name=mouse-options]")
    .on("change", function() {
      dataObj.setNavMode(this.value);
    });

  /* summary mode switching */
  d3.selectAll("#summary-options input[name=summary-options]")
    .on("change", function() {
      dataObj.setOrder(this.value);
    });

  /* Plot variable switching */
  d3.selectAll("#plot-var-options input[name=plot-var-options]")
    .on("change", function() {
      dataObj.setSummaryField(this.value);
      globalColorScale = colorScales[dataObj.getSummaryField()][colorScale];
      dataObj.notifyListeners('color-scale-change');
    });

  /* color mode switching */
  var colorScale = 'rg';
  d3.selectAll("#color-options input[name=color-options]")
    .on("change", function() {
      globalColorScale = colorScales[dataObj.getSummaryField()][this.value];
      colorScale = this.value;
      dataObj.notifyListeners('color-scale-change');
    });

  var extents = {
    logks: d3.extent(_.pluck(dataObj.currentData(), 'logks')),
    logkn: d3.extent(_.pluck(dataObj.currentData(), 'logkn')),
    logkskn: d3.extent(_.pluck(dataObj.currentData(), 'logkskn'))
  };

  var colorRanges = {
    rg: ['red', 'green'],
    rg_quantized: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
    rainbow: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
    rainbow_quantized: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']
  };

  var colorScales = _.mapObject(extents, function(extent) {
    var max = extent[1];
    var min = extent[0];
    var range = max - min;

    return _.mapObject(colorRanges, function(colorRange, colorScaleName) {
      var step = range / (colorRange.length - 1);
      // Extra .5 * step is to avoid missing a value because of floating point precision 
      var domain = _.range(min, max + .5 * step, step);

      var scale = colorScaleName.indexOf('quantized') > -1 ? d3.scale.quantize() : d3.scale.linear();
      return scale.domain(domain).range(colorRange);
    });
  });

  globalColorScale = colorScales[dataObj.getSummaryField()][colorScale];

  synteny('#dotplot', dataObj);
  histogram('#plot', dataObj, 'logks');
  histogram('#plot2', dataObj, 'logkn');
  histogram('#plot3', dataObj, 'logkskn');
}

function synteny(id, dataObj) {

  var xExtent = [0, _.max(dataObj.getXLineOffsets())];
  var yExtent = [0, _.max(dataObj.getYLineOffsets())];
  var dataAspectRatio = yExtent[1] / xExtent[1];

  var computedWidth = getComputedAttr(d3.select(id).node(), 'width') - 2 * SYNTENY_MARGIN;
  var computedHeight = getComputedAttr(d3.select(id).node(), 'height') - 2 * SYNTENY_MARGIN;
  var windowAspectRatio = computedHeight / computedWidth;

  var width;
  var height;

  if (windowAspectRatio / dataAspectRatio > 1) {
    width = computedWidth;
    height = dataAspectRatio * width;
  } else {
    height = computedHeight;
    width = 1 / dataAspectRatio * height;
  }

  d3.select(id).attr('width', width + 2 * SYNTENY_MARGIN);
  d3.select(id).attr('height', height + 2 * SYNTENY_MARGIN);

  var xScale = d3.scale.linear().domain(xExtent).range([0, width]);
  var yScale = d3.scale.linear().domain(yExtent).range([height, 0]);
  var xScaleOriginal = xScale.copy();
  var yScaleOriginal = yScale.copy();

  var zoom = d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 100]).on('zoom', zoomed);

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

  function invert(e) {
    return [
      [xScaleOriginal.invert(e[0][0]), yScaleOriginal.invert(e[1][1])],
      [xScaleOriginal.invert(e[1][0]), yScaleOriginal.invert(e[0][1])],
    ];
  }

  function mainBrush() {
    if (brush.empty()) return;
    dataObj.addSpatialFilter(invert(brush.extent()), 'spatial');
    resizeBrushBoundary();
  }

  function mainBrushEnd() {
    if (brush.empty()) {
      dataObj.removeSpatialFilter('spatial-stop');
    } else {
      dataObj.addSpatialFilter(invert(brush.extent()), 'spatial-stop');
    }
  }

  var brush = d3.svg.brush()
    .x(d3.scale.linear()
      .domain([0, width])
      .range([0, width]))
    .y(d3.scale.linear()
      .domain([0, height])
      .range([0, height]))
    .on('brush', mainBrush)
    .on('brushend', mainBrushEnd);

  var canvas = d3.select(id + '-canvas')
    .attr('width', width + 2 * SYNTENY_MARGIN)
    .attr('height', height + 2 * SYNTENY_MARGIN);
  var context = document.getElementById(id.substring(1) + '-canvas').getContext('2d');

  var svgPre = d3.select(id);

  var TEXT_OFFSET = 35;
  var TEXT_BOX_HEIGHT = 25;
  svgPre.append('text')
    .attr('x', (width + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (width + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN + height + TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(X_AXIS_ORGANISM_NAME);

  svgPre.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -2*(width + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (width + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN - TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(Y_AXIS_ORGANISM_NAME);

  svgPre
    .append('defs')
    .append('clipPath')
    .attr('id', 'plot-clip-box')
    .append('rect')
    .attr('x', 0)
    .attr('width', width)
    .attr('y', 0)
    .attr('height', height)
    .attr('fill', 'black')

  var xOffsets = dataObj.getXLineOffsets();
  var xPairs = _.zip(_.initial(xOffsets), _.rest(xOffsets));
  var xAxisTickValues = _.map(xPairs, function(p) {
    return (p[0] + p[1]) / 2;
  });
  var xOffsetToNameMap = _.object(xAxisTickValues, dataObj.getXLineNames());

  var xLineAxis = d3.svg.axis()
    .scale(xScale)
    .tickValues(xOffsets)
    .tickFormat(function(x) {
      return '';
    })
    .orient('bottom')
    .tickSize(-height);

  var xGapAxis = d3.svg.axis()
    .scale(xScale)
    .tickValues(xAxisTickValues)
    .tickFormat(function(x) {
      return xOffsetToNameMap[x];
    })
    .orient('bottom')
    .tickSize(0);

  var xAxisGapGroup = svgPre
    .append('g').classed('xAxis', true)
    .attr('transform', 'translate(' + SYNTENY_MARGIN + ',' + (height + SYNTENY_MARGIN) + ')')
    .call(xGapAxis);
  var xAxisLineGroup = svgPre
    .append('g').classed('xAxis', true)
    .attr('transform', 'translate(' + SYNTENY_MARGIN + ',' + (height + SYNTENY_MARGIN) + ')')
    .call(xLineAxis);

  var yOffsets = dataObj.getYLineOffsets();
  var yPairs = _.zip(_.initial(yOffsets), _.rest(yOffsets));
  var yAxisTickValues = _.map(yPairs, function(p) {
    return (p[0] + p[1]) / 2;
  });
  var yOffsetToNameMap = _.object(yAxisTickValues, dataObj.getYLineNames());

  var yLineAxis = d3.svg.axis()
    .scale(yScale)
    .tickValues(yOffsets)
    .tickFormat(function(x) {
      return '';
    })
    .orient('left')
    .tickSize(-width);

  var yGapAxis = d3.svg.axis()
    .scale(yScale)
    .tickValues(yAxisTickValues)
    .tickFormat(function(x) {
      return yOffsetToNameMap[x];
    })
    .orient('left')
    .tickSize(0);

  var yAxisGapGroup = svgPre
    .append('g').classed('yAxis', true)
    .attr('transform', 'translate(' + SYNTENY_MARGIN + ',' + SYNTENY_MARGIN + ')')
    .call(yGapAxis);
  var yAxisLineGroup = svgPre
    .append('g').classed('yAxis', true)
    .attr('transform', 'translate(' + SYNTENY_MARGIN + ',' + SYNTENY_MARGIN + ')')
    .call(yLineAxis);

  svgPre = svgPre
    .append('g')
    .attr('transform', 'translate(' + SYNTENY_MARGIN + ',' + SYNTENY_MARGIN + ')')
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning

  var lastColorScale;

  function setSyntenyData() {
    var colorScale = globalColorScale;

    function draw(n, a, b) {
      var start = Date.now();
      var d = dataObj.currentData();
      var split = _.partition(d, 'active');
      d = split[1].concat(split[0]);
      context.clearRect(0, 0, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
      var field = dataObj.getSummaryField();
      var gent = dataObj.getGEvNTMode();
      for (var i = 0; i < d.length; ++i) {
        var e = d[i][gent];
        var cx = SYNTENY_MARGIN + xScale(e.x_relative_offset);
        var cy = SYNTENY_MARGIN + yScale(e.y_relative_offset);
        context.beginPath();
        context.moveTo(cx, cy);
        var color = d[i].active ? b(d[i][field]) : '#D0D0D0';
        context.fillStyle = color;
        context.arc(cx, cy, 2, 0, 2 * Math.PI);
        context.fill();
      }
      context.clearRect(0, 0, SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
      context.clearRect(0, 0, width + 2 * SYNTENY_MARGIN, SYNTENY_MARGIN);
      context.clearRect(0, height + SYNTENY_MARGIN, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
      context.clearRect(width + SYNTENY_MARGIN, 0, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);

      if (n > 0) {
        var diff = Date.now() - start;
        //console.log(diff);
        setTimeout(draw, 60, n - 60 - diff, a, b);
      }
    }

    if (lastColorScale === colorScale) {
      draw(0, colorScale, colorScale);
    } else {
      draw(COLOR_TRANS_LEN,
        lastColorScale ? lastColorScale : colorScale, colorScale);
    }
    lastColorScale = colorScale;


  }
  dataObj.addListener(setSyntenyData);

  var brushGroup = svgPre
    .append('g').attr('clip-path', 'url(#plot-clip-box)')
    .append('g').attr('id', 'brush-group')
    .call(brush);


  setSyntenyData();

  function zoomed() {
    var t = d3.event.translate;
    var s = d3.event.scale;
    t[0] = Math.min(0, Math.max(-width * s + width, t[0]));
    t[1] = Math.min(0, Math.max(-height * s + height, t[1]));
    // prevents the translate from growing large. This way, you don't 
    // have to "scroll back" onto the canvas if you pan past the edge.
    zoom.translate(t);

    brushGroup.attr("transform", "translate(" + t + ")scale(" + s + ")");

    var tempXOffsets = _.filter(xOffsets, function(x) {
      return 0 <= xScale(x) && xScale(x) <= width;
    });
    var tempXGaps = _.filter(xAxisTickValues, function(x) {
      return 0 <= xScale(x) && xScale(x) <= width;
    });
    var tempYOffsets = _.filter(yOffsets, function(y) {
      return 0 <= yScale(y) && yScale(y) <= height;
    });
    var tempYGaps = _.filter(yAxisTickValues, function(y) {
      return 0 <= yScale(y) && yScale(y) <= height;
    });

    xLineAxis.tickValues(tempXOffsets);
    xGapAxis.tickValues(tempXGaps);
    yLineAxis.tickValues(tempYOffsets);
    yGapAxis.tickValues(tempYGaps);

    xAxisGapGroup.call(xGapAxis);
    yAxisGapGroup.call(yGapAxis);
    xAxisLineGroup.call(xLineAxis);
    yAxisLineGroup.call(yLineAxis);

    setSyntenyData();
  }

  function setNavigationMode(typeHint) {
    var mode = dataObj.getNavMode();
    if (mode === 'pan') {
      d3.select(id).select('#brush-group').on('mousedown.brush', null);
      d3.select(id).select('#zoom-group').call(zoom);
      d3.select(id).select('#brush-group').style('pointer-events', null);
      d3.select(id).select('#zoom-group').style('pointer-events', 'all');
    } else if (mode === 'brush') {
      d3.select(id).select('#brush-group').call(brush);
      d3.select(id).select('#brush-group').style('pointer-events', 'all');
      d3.select(id).select('#zoom-group').on('mousedown.zoom', null);
    }
  }
  dataObj.addListener(setNavigationMode);
}

function histogram(id, dataObj, field) {
  var dataExtent = d3.extent(_.pluck(dataObj.currentData(), field));

  var plot = d3.select(id);
  var plotWidth = getComputedAttr(plot.node(), 'width');
  var plotHeight = getComputedAttr(plot.node(), 'height');

  var prettyNames = {
    logks: 'log(ks)',
    logkn: 'log(kn)',
    logkskn: 'log(ks/kn)'
  };
  plot.append('text')
    .attr('x', 2 * plotHeight / 3)
    .attr('width', plotHeight / 3)
    .attr('y', 50)
    .attr('height', 50)
    .classed('histogram-title', true)
    .text(prettyNames[field]);

  function plotBrushBrush() {
    if (plotBrush.empty()) {
      dataObj.removeDataFilter(field);
    } else {
      dataObj.addDataFilter(plotBrush.extent(), field);
    }
  }

  function plotBrushEnd() {
    if (plotBrush.empty()) {
      dataObj.removeDataFilter(field);
    }
  }


  var xPlotScale = d3.scale.linear().domain(dataExtent).range([HISTOGRAM_MARGIN, plotWidth - HISTOGRAM_MARGIN]);

  var bins = xPlotScale.ticks(NUM_HISTOGRAM_TICKS).slice(1);
  var lastYExtent = [0, 3 / 2 * d3.max(_.pluck(dataObj.currentDataSummary(bins, field), 'y'))];

  var yPlotScale = d3.scale.linear().domain(lastYExtent).range([plotHeight - HISTOGRAM_MARGIN, HISTOGRAM_MARGIN]);

  var plotBrush = d3.svg.brush()
    .x(xPlotScale)
    .on('brush', plotBrushBrush)
    .on('brushend', plotBrushEnd);

  plot.append('g').attr('id', 'plotbrush-group')
    .attr('transform', 'translate(0,' + HISTOGRAM_MARGIN + ')')
    .call(plotBrush)
    .selectAll('rect').attr('height', plotHeight - 2 * HISTOGRAM_MARGIN);

  var ticks = xPlotScale.ticks(NUM_HISTOGRAM_TICKS).slice(1);
  plot.selectAll('.dataBars')
    .data(ticks)
    .enter()
    .append('rect').classed('dataBars', true);

  var xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom').tickSize(10);
  var yAxis = d3.svg.axis().scale(yPlotScale).orient('left');

  plot.append('g')
    .attr('transform', 'translate(0,' + (plotHeight - HISTOGRAM_MARGIN) + ')')
    .classed('xAxis', true).call(xAxis);
  var yAxisSel = plot.append('g')
    .attr('transform', 'translate(' + HISTOGRAM_MARGIN + ',0)')
    .classed('yAxis', true).call(yAxis);

  function updatePlot(typeHint) {
    if (typeHint === 'variable-change') {
      dataExtent = d3.extent(
        _.pluck(dataObj.currentData(),
          dataObj.getSummaryField()));
      xPlotScale.domain(dataExtent)
      var ticks = xPlotScale.ticks(NUM_HISTOGRAM_TICKS).slice(1);
      var temp = plot.selectAll('.dataBars').data(ticks);
      temp.exit().remove();
      temp.enter().append('rect').classed('dataBars', true);
      typeHint = 'spatial-stop';
    }

    function updatePlotAttrs(selection) {
      var colorScale = globalColorScale;
      var temp = selection
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
          return plotHeight - HISTOGRAM_MARGIN - yPlotScale(d.y);
        })

      if (typeHint.indexOf('initial') === -1 && typeHint.indexOf('data') === -1) {
        temp = temp.transition().duration(COLOR_TRANS_LEN);
      }
      temp
        .attr('fill', function(d) {
          if (field === dataObj.getSummaryField()) {
            return d.active ? colorScale(d.x + d.dx / 2) : 'grey';
          } else {
            return d.active ? 'steelblue' : 'grey';
          }
        });
    }

    if (typeHint.indexOf('spatial-stop') >= 0 || typeHint === 'data-stop') {
      lastYExtent = [0, 3 / 2 * d3.max(_.pluck(dataObj.currentDataSummary(bins, field), 'y'))];
      yPlotScale.domain(lastYExtent);
      yAxisSel.transition()
        .duration(HISTOGRAM_Y_SCALE_TRANS_LEN)
        .call(yAxis);
      plot.selectAll('.dataBars')
        .data(dataObj.currentDataSummary(bins, field))
        .transition()
        .duration(HISTOGRAM_Y_SCALE_TRANS_LEN)
        .call(updatePlotAttrs);
    } else {
      plot.selectAll('.dataBars')
        .data(dataObj.currentDataSummary(bins, field))
        .call(updatePlotAttrs);
    }
  }

  updatePlot('initial');
  dataObj.addListener(updatePlot);


  function reColorDataBars() {
    var colorScale = globalColorScale;
    plot.selectAll('.dataBars')
      .transition().duration(500)
      .attr('fill', function(d) {
        return colorScale(d.x + d.dx / 2);
      });
  }

  function filterBarsByData(range, selField, selector) {
    /* Broken -- doesn't properly filter on other plot fields */
    plot.selectAll('.dataBars')
      .classed(selector, function(d) {
        return d.x > range[1] || d.x + d.dx < range[0];
      });
  }
}

