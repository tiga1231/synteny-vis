'use strict';

var SYNTENY_MARGIN = 50; /* Padding around synteny plot for axes */
var HISTOGRAM_MARGIN = 50; /* Padding around histogram */
var HISTOGRAM_Y_SCALE_TRANS_LEN = 750; /* How long a y-axis histogram rescale takes */
var COLOR_TRANS_LEN = 500; /* How long a color scale transition takes */
var NUM_HISTOGRAM_TICKS = 100;
var CIRCLE_RADIUS = 2;
var UNSELECTED_DOT_FILL = '#D0D0D0';
var NUM_COLOR_SCALE_INTERPOLATION_SAMPLES = 100;

var SHOW_MAXIMA = true;
var SHOW_MINIMA = true;

var COLOR_RANGES = {
  rg: ['red', 'green'],
  rg_quantized: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
  rainbow: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
  rainbow_quantized: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']
};

function getComputedAttr(element, attr) {
  var computed = window.getComputedStyle(element)[attr];
  return parseInt(computed, 10);
}

function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}

var refreshAutoDots;

function refreshAutoScale() {
  var radio = document.getElementById('color-options');
  var auto = _.find(radio.children, {
    value: 'auto'
  });
  auto.checked = false;
  auto.click();
}

function getPersistence() {
  return Number(document.getElementById('persistence').value);
}

function controller(dataObj) {

  refreshAutoDots = function() {
    var p = getPersistence();
    _.each(histograms, function(h) {
      h.generateAutoScale(p);
    });
  };
  dataObj.addListener(refreshAutoDots);

  var syntenyPlot;
  /* zoom/pan switching */
  d3.selectAll("#mouse-options input[name=mouse-options]")
    .on("change", function() {
      syntenyPlot.setNavMode(this.value);
    });

  /* summary mode switching */
  d3.selectAll("#summary-options input[name=summary-options]")
    .on("change", function() {
      dataObj.setOrder('logks', this.value === 'minimum');
    });

  /* Plot variable switching */
  d3.selectAll("#plot-var-options input[name=plot-var-options]")
    .on("change", function() {
      histograms[activeField].setColorScale(steelBlueCS);
      activeField = this.value;
      syntenyPlot.setField(activeField);
      var newCS;
      if (activeCS === 'auto') {
        newCS = histograms[activeField].generateAutoScale(getPersistence());
      } else {
        newCS = colorScales[activeField][activeCS];
      }
      syntenyPlot.setColorScale(newCS);
      histograms[activeField].setColorScale(newCS);
    });

  /* color mode switching */
  var activeField = 'logks';
  var activeCS = 'rg';
  d3.selectAll("#color-options input[name=color-options]")
    .on("change", function() {
      var newCS;
      if (this.value === 'auto') {
        newCS = histograms[activeField].generateAutoScale(getPersistence());
      } else {
        newCS = colorScales[activeField][this.value];
      }
      histograms[activeField].setColorScale(newCS);
      syntenyPlot.setColorScale(newCS);
      activeCS = this.value;
    });

  var fields = ['logks', 'logkn', 'logkskn'];
  var colorScales = _.chain(fields)
    .map(function(field) {
      return [field, d3.extent(_.pluck(dataObj.currentData().raw, field))];
    })
    .object()
    .mapValues(function(extent) {
      var max = extent[1];
      var min = extent[0];
      var range = max - min;

      return _.mapValues(COLOR_RANGES, function(colorRange, colorScaleName) {
        var step = range / (colorRange.length - 1);
        // Extra .5 * step is to avoid missing a value because of floating point precision
        var domain = _.range(min, max + 0.5 * step, step);

        var scale = colorScaleName.indexOf('quantized') > -1 ? d3.scale.quantize() : d3.scale.linear();
        return scale.domain(domain).range(colorRange);
      });
    })
    .value();


  var steelBlueCS = _.constant('steelblue');
  var initialColorScale = colorScales[activeField]['rg'];

  syntenyPlot = synteny('#dotplot', dataObj, 'logks', initialColorScale);
  var histograms = {
    'logks': histogram('#plot', dataObj, 'logks', initialColorScale),
    'logkn': histogram('#plot2', dataObj, 'logkn', steelBlueCS),
    'logkskn': histogram('#plot3', dataObj, 'logkskn', steelBlueCS)
  };
  dataObj.notifyListeners('initial');
}

function synteny(id, dataObj, field, initialColorScale) {

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

  var zoom = d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 100]).on('zoom', function() {
    var t = d3.event.translate;
    var s = d3.event.scale;
    t[0] = Math.min(0, Math.max(-width * s + width, t[0]));
    t[1] = Math.min(0, Math.max(-height * s + height, t[1]));
    // prevents the translate from growing large. This way, you don't 
    // have to "scroll back" onto the canvas if you pan past the edge.
    zoom.translate(t);

    brushGroup.attr("transform", translate(t[0], t[1]) + 'scale(' + s + ')');

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
    xGapsAxis.tickValues(tempXGaps);
    yLineAxis.tickValues(tempYOffsets);
    yGapsAxis.tickValues(tempYGaps);

    xAxisGapsGroup.call(xGapsAxis);
    yAxisGapsGroup.call(yGapsAxis);
    xAxisLineGroup.call(xLineAxis);
    yAxisLineGroup.call(yLineAxis);

    setSyntenyData();
  });

  function resizeBrushBoundary() {
    var scaling = zoom.scale();
    var corners = ['.nw', '.ne', '.se', '.sw'];
    var vertical = ['.e', '.w'];
    var horizontal = ['.elapsedMS', '.s'];
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

  /* We are copying the scale here because brushes do not play nice with zooming.
   * All sorts of nasty things happen when the scales get changed underneath a
   * brush. */
  var brush = d3.svg.brush()
    .x(xScale.copy())
    .y(yScale.copy())
    .on('brush', function() {
      if (!brush.empty()) {
        dataObj.addSpatialFilter(brush.extent(), 'spatial');
        resizeBrushBoundary();
      }
    })
    .on('brushend', function() {
      if (brush.empty()) {
        dataObj.removeSpatialFilter('spatial-stop');
      } else {
        dataObj.addSpatialFilter(brush.extent(), 'spatial-stop');
      }
    });

  d3.select(id + '-canvas')
    .attr('width', width + 2 * SYNTENY_MARGIN)
    .attr('height', height + 2 * SYNTENY_MARGIN);
  var context = document.getElementById(id.substring(1) + '-canvas').getContext('2d');

  var svg = d3.select(id);

  var TEXT_OFFSET = 35;
  var TEXT_BOX_HEIGHT = 25;
  svg.append('text')
    .attr('x', (width + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (width + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN + height + TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(X_AXIS_ORGANISM_NAME);

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -2 * (height + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (height + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN - TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(Y_AXIS_ORGANISM_NAME);

  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'plot-clip-box')
    .append('rect')
    .attr('x', 0)
    .attr('width', width)
    .attr('y', 0)
    .attr('height', height)
    .attr('fill', 'black');

  var xOffsets = dataObj.getXLineOffsets();
  var xPairs = _.zip(_.initial(xOffsets), _.rest(xOffsets));
  var xAxisTickValues = _.map(xPairs, function(p) {
    return (p[0] + p[1]) / 2;
  });
  var xOffsetToNameMap = _.object(xAxisTickValues, dataObj.getXLineNames());

  var xLineAxis = d3.svg.axis()
    .scale(xScale)
    .tickValues(xOffsets)
    .tickFormat(_.constant(''))
    .orient('bottom')
    .tickSize(-height);

  var xGapsAxis = d3.svg.axis()
    .scale(xScale)
    .tickValues(xAxisTickValues)
    .tickFormat(function(x) {
      return xOffsetToNameMap[x];
    })
    .orient('bottom')
    .tickSize(0);

  var xAxisWrapper = svg.append('g').attr('transform', translate(SYNTENY_MARGIN, height + SYNTENY_MARGIN));
  var xAxisGapsGroup = xAxisWrapper.append('g').classed('xAxis', true).call(xGapsAxis);
  var xAxisLineGroup = xAxisWrapper.append('g').classed('xAxis', true).call(xLineAxis);

  var yOffsets = dataObj.getYLineOffsets();
  var yPairs = _.zip(_.initial(yOffsets), _.rest(yOffsets));
  var yAxisTickValues = _.map(yPairs, function(p) {
    return (p[0] + p[1]) / 2;
  });
  var yOffsetToNameMap = _.object(yAxisTickValues, dataObj.getYLineNames());

  var yLineAxis = d3.svg.axis()
    .scale(yScale)
    .tickValues(yOffsets)
    .tickFormat(_.constant(''))
    .orient('left')
    .tickSize(-width);

  var yGapsAxis = d3.svg.axis()
    .scale(yScale)
    .tickValues(yAxisTickValues)
    .tickFormat(function(x) {
      return yOffsetToNameMap[x];
    })
    .orient('left')
    .tickSize(0);

  var yAxisWrapper = svg.append('g').attr('transform', translate(SYNTENY_MARGIN, SYNTENY_MARGIN));
  var yAxisGapsGroup = yAxisWrapper.append('g').classed('yAxis', true).call(yGapsAxis);
  var yAxisLineGroup = yAxisWrapper.append('g').classed('yAxis', true).call(yLineAxis);

  svg = svg
    .append('g')
    .attr('transform', translate(SYNTENY_MARGIN, SYNTENY_MARGIN))
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning

  var brushGroup = svg
    .append('g').attr('clip-path', 'url(#plot-clip-box)')
    .append('g').attr('id', 'brush-group')
    .call(brush);

  var colorScale = initialColorScale;
  var field;

  function draw(elapsedMS, initialColorScale, finalColorScale) {
    var start = Date.now();
    var gent = dataObj.getGEvNTMode();

    var intermediateColorScale;
    if (elapsedMS > 0) {
      var t = Math.min((COLOR_TRANS_LEN - elapsedMS) / COLOR_TRANS_LEN, 1);
      intermediateColorScale = interpolateScales(initialColorScale, finalColorScale, t);
    } else {
      intermediateColorScale = finalColorScale;
    }

    var allData = dataObj.currentData();
    var activeDots = allData.active;
    var inactiveDots = allData.inactive;

    context.clearRect(0, 0, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);

    /* First, inactive dots */
    context.fillStyle = UNSELECTED_DOT_FILL;
    _.each(inactiveDots, function(dot) {
      var d = dot[gent];
      var cx = SYNTENY_MARGIN + xScale(d.x_relative_offset);
      var cy = SYNTENY_MARGIN + yScale(d.y_relative_offset);
      context.beginPath();
      context.moveTo(cx, cy);
      context.arc(cx, cy, CIRCLE_RADIUS, 0, 2 * Math.PI);
      context.fill();
    });

    /* On top, active dots */
    _.each(activeDots, function(dot) {
      var d = dot[gent];
      var cx = SYNTENY_MARGIN + xScale(d.x_relative_offset);
      var cy = SYNTENY_MARGIN + yScale(d.y_relative_offset);
      context.beginPath();
      context.moveTo(cx, cy);
      context.fillStyle = intermediateColorScale(dot[field]);
      context.arc(cx, cy, CIRCLE_RADIUS, 0, 2 * Math.PI);
      context.fill();
    });
    context.fillStyle = 'white';
    context.fillRect(0, 0, width + 2 * SYNTENY_MARGIN, SYNTENY_MARGIN);
    context.fillRect(0, 0, SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
    context.fillRect(SYNTENY_MARGIN + width, 0, SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
    context.fillRect(0, height + SYNTENY_MARGIN, width + 2 * SYNTENY_MARGIN, SYNTENY_MARGIN);

    var diff = Date.now() - start;
    //console.log(diff);
    if (elapsedMS > 0) {
      setTimeout(draw, 0, elapsedMS - diff, initialColorScale, finalColorScale);
    }
  }

  function interpolateScales(a, b, t) {
    var aDomain = a.domain();
    var bDomain = b.domain();
    var min = Math.min(aDomain[0], bDomain[0]);
    var max = Math.max(aDomain[1], bDomain[1]);
    var step = (max - min) / NUM_COLOR_SCALE_INTERPOLATION_SAMPLES;
    var domain = _.range(min, max + 1, step);
    var range = _.map(domain, function(input) {
      return d3.interpolateRgb(a(input), b(input))(t);
    });
    return d3.scale.linear().domain(domain).range(range);
  }


  function setSyntenyData(typeHint) {
    draw(0, colorScale, colorScale);
  }
  dataObj.addListener(setSyntenyData);
  setSyntenyData();

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

  function setColorScale(newColorScale) {
    draw(COLOR_TRANS_LEN, colorScale, newColorScale);
    colorScale = newColorScale;
  }

  function setField(f) {
    field = f;
    setSyntenyData();
  }

  return {
    setNavMode: setNavigationMode,
    setColorScale: setColorScale,
    setField: setField
  };
}

function histogram(id, dataObj, field, initialColorScale) {
  var dataExtent = d3.extent(_.pluck(dataObj.currentData().raw, field));

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
    if (!plotBrush.empty()) {
      dataObj.addDataFilter(plotBrush.extent(), field);
    }
  }

  function plotBrushEnd() {
    if (plotBrush.empty()) {
      dataObj.removeDataFilter(field);
    }
  }

  var colorScale = initialColorScale;
  var xPlotScale = d3.scale.linear().domain(dataExtent).range([HISTOGRAM_MARGIN, plotWidth - HISTOGRAM_MARGIN]);

  function makeBins() {
    var data = _.chain(dataObj.currentData().raw).pluck(field).sortBy().value();
    //var n = Math.floor(Math.sqrt(data.length));
    //var n = 2 * Math.floor(Math.pow(data.length, 1/3));
    var n = NUM_HISTOGRAM_TICKS;
    var min = dataExtent[0];
    var max = dataExtent[1];
    var range = max - min;
    var step = range / n;
    return _.range(min, max, step);
  }

  var bins = makeBins();
  var lastYExtent = [0, 3 / 2 * d3.max(_.pluck(dataObj.currentDataSummary(bins, field), 'y'))];

  var yPlotScale = d3.scale.linear().domain(lastYExtent).range([plotHeight - HISTOGRAM_MARGIN, HISTOGRAM_MARGIN]);

  function generateAutoScale(persistence) {
    var summary = dataObj.currentDataSummary(bins, field);

    function removeNonExtrema(A) {
      return _.filter(A, function(p, i, a) {
        return i === 0 || i === a.length - 1 ||
          (a[i - 1].y - a[i].y) * (a[i].y - a[i + 1].y) < 0;
      });
    }

    function edgeDelta(A, e) {
      return Math.abs(A[e[0]].y - A[e[1]].y);
    }

    function minimumDeltaEdge(A) {
      var edges = _.zip(_.range(0, A.length - 1), _.range(1, A.length));
      return _.min(edges, _.partial(edgeDelta, A));
    }

    var mm = removeNonExtrema(summary);
    while (edgeDelta(mm, minimumDeltaEdge(mm)) < persistence) {
      var e = minimumDeltaEdge(mm);
      if (e[0] === 0) {
        if (mm.length <= 3) break;
        mm.splice(1, 1);
      } else if (e[1] === mm.length - 1) {
        if (mm.length <= 3) break;
        mm.splice(mm.length - 2, 1);
      } else {
        if (mm.length <= 4) break;
        mm.splice(e[0], 1);
      }
      mm = removeNonExtrema(mm);
    }

    mm = _.partition(mm, function(p, i, a) {
      return i === 0 || i === a.length - 1 ||
        p.y > a[i - 1].y || p.y > a[i + 1].y;
    });

    var maxima = mm[0];
    var minima = mm[1];

    if (maxima.length > 3) {
      maxima = _.chain(maxima).initial().rest().value();
    }

    _.each(maxima, function(m) {
      _.defaults(m, {
        max: true
      });
    });
    _.each(minima, function(m) {
      _.defaults(m, {
        max: false
      });
    });

    if (SHOW_MAXIMA || SHOW_MINIMA) {
      var tempSelA = plot.selectAll('.maxMark').data(maxima.concat(minima));
      tempSelA.exit().remove();
      tempSelA.enter().append('circle').classed('maxMark', 1);
      tempSelA
        .attr('cx', function(d) {
          return xPlotScale(d.x + d.dx / 2);
        })
        .attr('cy', function(d) {
          return yPlotScale(d.y) - 5;
        })
        .attr('r', 3)
        .attr('fill', function(d) {
          return d.max ? 'red' : 'orange';
        })
        .attr('opacity', function(d) {
          return ((d.max && SHOW_MAXIMA) || (!d.max && SHOW_MINIMA)) ? 1 : 0;
        });
    }

    _.each(maxima, function(m, i) {
      m.colorIndex = i;
    });

    var combined = _.sortBy(minima.concat(maxima), 'x');

    var colors = d3.scale.category10();
    var auto = d3.scale.linear()
      .domain(_.map(combined, function(d) {
        return d.x + d.dx / 2
      }))
      .range(_.chain(combined).map(function(m) {
        return m.max ? colors(m.colorIndex) : UNSELECTED_DOT_FILL;
      }).value());

    return auto;
  }

  var plotBrush = d3.svg.brush()
    .x(xPlotScale)
    .on('brush', plotBrushBrush)
    .on('brushend', plotBrushEnd);

  plot.selectAll('.dataBars')
    .data(bins)
    .enter()
    .append('rect').classed('dataBars', true);

  plot.append('g').attr('id', 'plotbrush-group')
    .attr('transform', translate(0, HISTOGRAM_MARGIN))
    .call(plotBrush)
    .selectAll('rect').attr('height', plotHeight - 2 * HISTOGRAM_MARGIN);


  var xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom').tickSize(10);
  var yAxis = d3.svg.axis().scale(yPlotScale).orient('left').ticks(5);

  plot.append('g')
    .attr('transform', translate(0, plotHeight - HISTOGRAM_MARGIN))
    .classed('xAxis', true).call(xAxis);
  var yAxisSel = plot.append('g')
    .attr('transform', translate(HISTOGRAM_MARGIN, 0))
    .classed('yAxis', true).call(yAxis);

  function updatePlotAttrs(selection) {
    var activeFunc = plotBrush.empty() ? _.constant(true) : function(bin) {
      return bin.x + bin.dx > plotBrush.extent()[0] &&
        bin.x < plotBrush.extent()[1];
    };
    selection
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
      .attr('fill', function(d) {
        return activeFunc(d) ? colorScale(d.x + d.dx / 2) : 'grey';
      });
  }

  function updatePlot(typeHint) {

    plot.selectAll('.dataBars')
      .data(dataObj.currentDataSummary(bins, field))
      .call(updatePlotAttrs);

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

      plot.selectAll('.maxMark')
        .transition().duration(HISTOGRAM_Y_SCALE_TRANS_LEN)
        .attr('cy', function(d) {
          return yPlotScale(d.y) - 5;
        });
    } else {
      // To disable sharp transitions, move that chunk above down here. 
    }
  }

  updatePlot('initial');
  dataObj.addListener(updatePlot);

  function setColorScale(newColorScale) {
    colorScale = newColorScale;
    plot.selectAll('.dataBars')
      .transition().duration(COLOR_TRANS_LEN)
      .call(updatePlotAttrs);
  }
  return {
    setColorScale: setColorScale,
    generateAutoScale: generateAutoScale
  };
}

