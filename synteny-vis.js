var scaleMargin = 50;

/* Histogram settings */
var margin = 50; /* padding around graph */
var plotWidth = 400;
var plotHeight = 400;
var histogramYScaleTransitionLength = 750;
var colorScaleTransitionLength = 500;

function controller(dataObj, cumulative) {
  /* zoom/pan switching */
  d3.selectAll("#mouse-options input[name=mouse-options]")
    .on("change", function() {
      globals.setNavigationMode(this.value);
    });

  /* summary mode switching */
  var order = 'minimum'
  d3.selectAll("#summary-options input[name=summary-options]")
    .on("change", function() {
      console.log(this.value);
      order = this.value;
      globals.redraw();
    });

  /* color mode switching */
  d3.selectAll("#color-options input[name=color-options]")
    .on("change", function() {
      colorScale = colorScales[this.value];
      dataObj.notifyListeners();
    });


  var colorScale;

  var field = 'logks';
  var dataMax = d3.max(_.pluck(dataObj.currentData(), field));
  var dataMin = d3.min(_.pluck(dataObj.currentData(), field));
  var diff = dataMax - dataMin;

  function partitionedExtent(n) {
    var step = diff / (n - 1);
    return _.range(dataMin, dataMax + .5 * step, step);
  }

  var colorScales = {
    rg: d3.scale.linear()
      .domain(partitionedExtent(2))
      .range(['red', 'green']),

    rg_quantized: d3.scale.quantize()
      .domain(partitionedExtent(11))
      .range(['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837']),

    ryb: d3.scale.linear()
      .domain(partitionedExtent(3))
      .range(['#fc8d59', '#ffffbf', '#91bfdb']),

    rainbow: d3.scale.linear()
      .domain(partitionedExtent(7))
      .range(['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']),

    rainbow_quantized: d3.scale.quantize()
      .domain(partitionedExtent(7))
      .range(['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']),
  };
  colorScale = colorScales['rg'];

  globals.getColorScale = function() {
    return colorScale;
  };
  globals.getSummaryType = function() {
    return order;
  };

  var funcs = [
    synteny('#main', dataObj, field),
    histogram('#plot', dataObj, field),
  ];

  globals.zoomed = function() {};

  globals.setNavigationMode = function(mode) {
    _.each(_.compact(funcs), function(o) {
      o.setNavigationMode(mode);
    });
  }
}

var globals = {};

function synteny(id, dataObj, field) {

  var xExtent = [0, _.last(dataObj.getXLineOffsets())];
  var yExtent = [0, _.last(dataObj.getYLineOffsets())];

  var width = d3.select(id).attr('width') - 2*scaleMargin;
  var height = yExtent[1] / xExtent[1] * width + 2*scaleMargin;
  d3.select(id).attr('height', height);

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
    dataObj.addSpatialFilter(invert(brush.extent()));
    resizeBrushBoundary();
  }

  function mainBrushEnd() {
    if (brush.empty()) {
      dataObj.removeSpatialFilter({
        stopping: true
      });
    } else {
      dataObj.addSpatialFilter(invert(brush.extent()), {
        stopping: true
      });
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
    .attr('width', width + 2 * scaleMargin)
    .attr('height', height + 2 * scaleMargin);
  var context = document.getElementById('main-canvas').getContext('2d');

  var svgPre = d3.select(id)
    .attr('width', width + 2 * scaleMargin)
    .attr('height', height + 2 * scaleMargin);

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
    .attr('transform', 'translate(' + scaleMargin + ',' + (height + scaleMargin) + ')')
    .call(xGapAxis);
  var xAxisLineGroup = svgPre
    .append('g').classed('xAxis', true)
    .attr('transform', 'translate(' + scaleMargin + ',' + (height + scaleMargin) + ')')
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
      return yOffsetToNameMap[x].length > 3 ? '' : yOffsetToNameMap[x];
    })
    .orient('left')
    .tickSize(0);

  var yAxisGapGroup = svgPre
    .append('g').classed('yAxis', true)
    .attr('transform', 'translate(' + scaleMargin + ',' + scaleMargin + ')')
    .call(yGapAxis);
  var yAxisLineGroup = svgPre
    .append('g').classed('yAxis', true)
    .attr('transform', 'translate(' + scaleMargin + ',' + scaleMargin + ')')
    .call(yLineAxis);

  svgPre = svgPre
    .append('g')
    .attr('transform', 'translate(' + scaleMargin + ',' + scaleMargin + ')')
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning

  var lastColorScale;

  function setSyntenyData() {
    var colorScale = globals.getColorScale();

    function draw(n, a, b) {
      var start = Date.now();
      var d = dataObj.currentData();
      context.clearRect(0, 0, width + 2 * scaleMargin, height + 2 * scaleMargin);
      for (var i = 0; i < d.length; ++i) {
        var e = d[i].nt;
        var cx = scaleMargin + xScale(e.x_relative_offset);
        var cy = scaleMargin + yScale(e.y_relative_offset);
        context.beginPath();
        context.moveTo(cx, cy);
        var color = d[i].active ? b(d[i].logks) : '#E6E6E6';
        //var color = d[i].active ? d3.interpolateRgb(a(d[i].logks), b(d[i].logks))((colorScaleTransitionLength - n) / colorScaleTransitionLength) : '#E6E6E6';
        context.fillStyle = color;
        context.arc(cx, cy, 2, 0, 2 * Math.PI);
        context.fill();
      }
      context.clearRect(0, 0, scaleMargin, height + 2 * scaleMargin);
      context.clearRect(0, 0, width + 2 * scaleMargin, scaleMargin);
      context.clearRect(0, height + scaleMargin, width + 2 * scaleMargin, height + 2 * scaleMargin);
      context.clearRect(width + scaleMargin, 0, width + 2 * scaleMargin, height + 2 * scaleMargin);

      if (n > 0) {
        var diff = Date.now() - start;
        console.log(diff);
        setTimeout(draw, 60, n - 60 - diff, a, b);
      }
    }

    if (lastColorScale === colorScale) {
      draw(0, colorScale, colorScale);
    } else {
      draw(colorScaleTransitionLength,
        lastColorScale ? lastColorScale : colorScale, colorScale);
    }
    lastColorScale = colorScale;


  }
  dataObj.addListener(setSyntenyData);

  var brushGroup = svgPre
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

  function setNavigationMode(mode) {
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

  return {
    setNavigationMode: setNavigationMode
  };
}

function histogram(id, dataObj, field) {
  var dataExtent = d3.extent(_.pluck(dataObj.currentData(), field));

  var plot = d3.select(id)
    .attr('width', plotWidth)
    .attr('height', plotHeight);

  plot.append('text')
    .attr('x', 2 * plotHeight / 3)
    .attr('width', plotHeight / 3)
    .attr('y', 50)
    .attr('height', 50)
    .classed('textInPlot', true)
    .text(field);

  function plotBrushBrush() {
    if (plotBrush.empty()) {
      dataObj.removeDataFilter();
    } else {
      dataObj.addDataFilter(plotBrush.extent());
    }
  }

  function plotBrushEnd() {
    if (plotBrush.empty()) {
      dataObj.removeDataFilter();
    }
  }

  var lastYExtent = [0, 3 / 2 * d3.max(_.pluck(dataObj.currentDataSummary(), 'y'))];

  var xPlotScale = d3.scale.linear().domain(dataExtent).range([margin, plotWidth - margin]);
  var yPlotScale = d3.scale.linear().domain(lastYExtent).range([plotHeight - margin, margin]);

  var plotBrush = d3.svg.brush()
    .x(xPlotScale)
    .on('brush', plotBrushBrush)
    .on('brushend', plotBrushEnd);

  plot.append('g').attr('id', 'plotbrush-group')
    .attr('transform', 'translate(0,' + margin + ')')
    .call(plotBrush)
    .selectAll('rect').attr('height', plotHeight - 2 * margin);

  var numTicks = xPlotScale.ticks(dataObj.currentDataSummary().length).slice(1);
  plot.selectAll('.dataBars')
    .data(numTicks)
    .enter()
    .append('rect').classed('dataBars', true);

  var xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom');
  var yAxis = d3.svg.axis().scale(yPlotScale).orient('left');

  plot.append('g')
    .attr('transform', 'translate(0,' + (plotHeight - 50) + ')')
    .classed('xAxis', true).call(xAxis);
  var yAxisSel = plot.append('g')
    .attr('transform', 'translate(50,0)')
    .classed('yAxis', true).call(yAxis);


  var firstTime = true;

  function updatePlot(shouldRescaleYAxis) {
    function updatePlotAttrs(selection) {
      var colorScale = globals.getColorScale();
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
          return plotHeight - margin - yPlotScale(d.y);
        })

      if (!firstTime) {
        temp = temp.transition().duration(colorScaleTransitionLength);
      }
      temp
        .attr('fill', function(d) {
          return colorScale(d.x + d.dx / 2);
        });
    }

    plot.selectAll('.dataBars').data(dataObj.currentDataSummary())
      .call(updatePlotAttrs);

    if (shouldRescaleYAxis) {
      lastYExtent = [0, 3 / 2 * d3.max(_.pluck(dataObj.currentDataSummary(), 'y'))];
      yPlotScale.domain(lastYExtent);
      yAxisSel.transition()
        .duration(histogramYScaleTransitionLength)
        .call(yAxis);
      plot.selectAll('.dataBars').transition()
        .duration(histogramYScaleTransitionLength)
        .call(updatePlotAttrs);
    }
  }

  updatePlot(true);
  firstTime = false;
  dataObj.addListener(updatePlot);


  function reColorDataBars() {
    var colorScale = globals.getColorScale();
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

  function filter(obj) {
    if (obj.extent) {
      updatePlot(obj.extent, obj.yAxis, obj.selector);
    } else if (obj.data) {
      filterBarsByData(obj.data, obj.field, obj.selector);
    }
  }
}

