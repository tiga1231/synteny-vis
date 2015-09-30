(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var util = require('./utils.js');

var SYNTENY_MARGIN = 50; /* Padding around synteny plot for axes */
var CIRCLE_RADIUS = 2;
var UNSELECTED_DOT_FILL = '#D0D0D0';
var NUM_COLOR_SCALE_INTERPOLATION_SAMPLES = 100;
var DOTPLOT_COLOR_TRANS_LEN = 500; /* How long a color scale transition takes */

function synteny(id, dataObj, field, initialColorScale) {

  var xExtent = [0, _.max(dataObj.getXLineOffsets())];
  var yExtent = [0, _.max(dataObj.getYLineOffsets())];
  var dataAspectRatio = yExtent[1] / xExtent[1];

  function getComputedAttr(element, attr) {
    var computed = window.getComputedStyle(element)[attr];
    return parseInt(computed, 10);
  }

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

    brushGroup.attr("transform", util.translate(t[0], t[1]) + 'scale(' + s + ')');

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

    setSyntenyData('zoom');
  });

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

  d3.select(id + '-canvas-bak')
    .attr('width', width + 2 * SYNTENY_MARGIN)
    .attr('height', height + 2 * SYNTENY_MARGIN);
  var contextbak = document.getElementById(id.substring(1) + '-canvas-bak').getContext('2d');
  var bgCanvas = document.createElement('canvas');
  var bgCanvasContext = bgCanvas.getContext('2d');
  bgCanvas.setAttribute('width', width + 2 * SYNTENY_MARGIN);
  bgCanvas.setAttribute('height', height + 2 * SYNTENY_MARGIN);

  var svg = d3.select(id);

  var TEXT_OFFSET = 35;
  var TEXT_BOX_HEIGHT = 25;
  svg.append('text')
    .attr('x', (width + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (width + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN + height + TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(dataObj.X_AXIS_ORGANISM_NAME);

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -2 * (height + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (height + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN - TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(dataObj.Y_AXIS_ORGANISM_NAME);

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


  var xAxisWrapper = svg.append('g').attr('transform', util.translate(SYNTENY_MARGIN, height + SYNTENY_MARGIN));
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

  var yAxisWrapper = svg.append('g').attr('transform', util.translate(SYNTENY_MARGIN, SYNTENY_MARGIN));
  var yAxisGapsGroup = yAxisWrapper.append('g').classed('yAxis', true).call(yGapsAxis);
  var yAxisLineGroup = yAxisWrapper.append('g').classed('yAxis', true).call(yLineAxis);

  svg = svg
    .append('g')
    .attr('transform', util.translate(SYNTENY_MARGIN, SYNTENY_MARGIN))
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning

  var brushGroup = svg
    .append('g').attr('clip-path', 'url(#plot-clip-box)')
    .append('g').attr('id', 'brush-group')
    .call(brush);

  var colorScale = initialColorScale;

  function draw(elapsedMS, initialColorScale, finalColorScale, typeHint) {
    var start = Date.now();
    var gent = dataObj.getGEvNTMode();

    var intermediateColorScale;
    if (elapsedMS > 0 && typeHint !== 'data') {
      var t = Math.min((DOTPLOT_COLOR_TRANS_LEN - elapsedMS) / DOTPLOT_COLOR_TRANS_LEN, 1);
      intermediateColorScale = interpolateScales(initialColorScale, finalColorScale, t);
    } else {
      intermediateColorScale = finalColorScale;
    }

    var allData = dataObj.currentData();
    var activeDots = allData.active;
    var allDots = allData.raw;

    //console.log('Time after collecting data', Date.now() - start);
    start = Date.now();

    if (typeHint === 'zoom') {
      contextbak.clearRect(0, 0, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
      contextbak.fillStyle = UNSELECTED_DOT_FILL;
      _.each(allDots, function(dot) {
        var d = dot[gent];
        var cx = SYNTENY_MARGIN + xScale(d.x_relative_offset);
        var cy = SYNTENY_MARGIN + yScale(d.y_relative_offset);

        if (cx < SYNTENY_MARGIN || cx > width + SYNTENY_MARGIN || cy < SYNTENY_MARGIN || cy > height + SYNTENY_MARGIN)
          return;

        contextbak.beginPath();
        contextbak.arc(cx, cy, CIRCLE_RADIUS, 0, 2 * Math.PI);
        contextbak.fill();
      });
    }

    //console.log('Time to draw bg points:', Date.now() - start);
    start = Date.now();

    context.clearRect(0, 0, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);

    /* On top, active dots */
    var cache = {};
    _.each(activeDots, function(dot) {
      var d = dot[gent];
      var cx = SYNTENY_MARGIN + xScale(d.x_relative_offset);
      var cy = SYNTENY_MARGIN + yScale(d.y_relative_offset);

      if (cx < SYNTENY_MARGIN || cx > width + SYNTENY_MARGIN || cy < SYNTENY_MARGIN || cy > height + SYNTENY_MARGIN)
        return;

      var bin = Math.floor(dot[field] * 10) / 10;
      if(!cache[bin])
        context.fillStyle = cache[bin] = intermediateColorScale(bin);

      context.fillRect(cx - CIRCLE_RADIUS, cy - CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS);
    });
    context.fillStyle = 'white';
    context.fillRect(0, 0, width + 2 * SYNTENY_MARGIN, SYNTENY_MARGIN);
    context.fillRect(0, 0, SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
    context.fillRect(SYNTENY_MARGIN + width, 0, SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
    context.fillRect(0, height + SYNTENY_MARGIN, width + 2 * SYNTENY_MARGIN, SYNTENY_MARGIN);

    var diff = Date.now() - start;
    //console.log('Start of call to end of draw call:', diff);
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
    draw(0, colorScale, colorScale, typeHint);
  }
  dataObj.addListener(setSyntenyData);
  setSyntenyData('zoom');

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
    draw(DOTPLOT_COLOR_TRANS_LEN, colorScale, newColorScale);
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

exports.synteny = synteny;

},{"./utils.js":7}],2:[function(require,module,exports){
'use strict';

var HISTOGRAM_MARGIN = 50; /* Padding around histogram */
var HISTOGRAM_Y_SCALE_TRANS_LEN = 750; /* How long a y-axis histogram rescale takes */
var HISTOGRAM_COLOR_TRANS_LEN = 500; /* How long a color scale transition takes */
var NUM_HISTOGRAM_TICKS = 100;
var UNSELECTED_BAR_FILL = '#D0D0D0';

var SHOW_MAXIMA = true;
var SHOW_MINIMA = true;

var REFRESH_Y_SCALE_ON_BRUSH_PAUSE = false;

var persist = require('./persistence');
var util = require('./utils');
var env = require('./window');

function histogram(id, dataObj, field, initialColorScale) {
  var dataExtent = d3.extent(_.pluck(dataObj.currentData().raw, field));

  var plot = d3.select(id);
  var plotWidth = util.getComputedAttr(plot.node(), 'width');
  var plotHeight = util.getComputedAttr(plot.node(), 'height');

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
    dataObj.notifyListeners('data-stop');
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

  var autoScale;

  function getAutoScale() {
    console.log(autoScale);
    if(!autoScale) generateAutoScale(dataObj.currentDataSummary(bins, field), env.getPersistence());
    return autoScale;
  }

  function generateAutoScale(summary, persistence) {

    function edgeDelta(A, e) {
      return Math.abs(A[e[0]].y - A[e[1]].y);
    }

    function minimumDeltaEdge(A) {
      var edges = _.zip(_.range(0, A.length - 1), _.range(1, A.length));
      return _.min(edges, _.partial(edgeDelta, A));
    }

    var mm = persist.removeNonExtrema(summary);
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
      mm = persist.removeNonExtrema(mm);
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
    autoScale = d3.scale.linear()
      .domain(_.map(combined, function(d) {
        return d.x + d.dx / 2;
      }))
      .range(_.chain(combined).map(function(m) {
        return m.max ? colors(m.colorIndex) : UNSELECTED_BAR_FILL;
      }).value());
  }

  var plotBrush = d3.svg.brush()
    .x(xPlotScale)
    .on('brush', plotBrushBrush)
    .on('brushend', plotBrushEnd);

  plot.selectAll('.dataBars')
    .data(bins)
    .enter()
    .append('rect').classed('dataBars', true);

  var brushSelectForBM = plot.append('g').attr('id', 'plotbrush-group')
    .attr('transform', util.translate(0, HISTOGRAM_MARGIN))
    .call(plotBrush);
  brushSelectForBM.selectAll('rect')
    .attr('height', plotHeight - 2 * HISTOGRAM_MARGIN);


  var xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom').tickSize(10);
  var yAxis = d3.svg.axis().scale(yPlotScale).orient('left').ticks(5);

  plot.append('g')
    .attr('transform', util.translate(0, plotHeight - HISTOGRAM_MARGIN))
    .classed('xAxis', true).call(xAxis);
  var yAxisSel = plot.append('g')
    .attr('transform', util.translate(HISTOGRAM_MARGIN, 0))
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

    typeHint = typeHint || '';
    var data = dataObj.currentDataSummary(bins, field);
    if (typeHint === 'data-stop' || typeHint == 'autoscale')
      generateAutoScale(data, env.getPersistence());
    plot.selectAll('.dataBars')
      .data(data)
      .call(updatePlotAttrs);

    if (typeHint.indexOf('spatial-stop') >= 0 || typeHint === 'data-stop') {
      lastYExtent = [0, 3 / 2 * d3.max(_.pluck(data, 'y'))];
      yPlotScale.domain(lastYExtent);
      yAxisSel.transition()
        .duration(HISTOGRAM_Y_SCALE_TRANS_LEN)
        .call(yAxis);
      plot.selectAll('.dataBars')
        .data(data)
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
    /*jshint -W087*/
  //debugger;
    console.log('set');
    colorScale = newColorScale;
    plot.selectAll('.dataBars')
      .transition().duration(HISTOGRAM_COLOR_TRANS_LEN)
      .call(updatePlotAttrs);
  }

  return {
    setColorScale: setColorScale,
    getAutoScale: getAutoScale,
    refreshAutoScale: updatePlot,
    brush: plotBrush,
    sendBrushEvent: plotBrushBrush,
    selection: brushSelectForBM
  };
}

exports.histogram = histogram;


},{"./persistence":4,"./utils":7,"./window":8}],3:[function(require,module,exports){
'use strict';

var DATA_OP_TIMING = false;

var X_AXIS_ORGANISM_NAME;
var Y_AXIS_ORGANISM_NAME;

var NUCLEOTIDE_LOWER_NAME_LIMIT = 1000 * 1000;

var loadksData = function(ks_filename, x_id, y_id, cb) {
  queue()
    .defer(d3.text, ks_filename)
    //.defer(d3.json, 'https://genomevolution.org/coge/api/v1/genomes/' + x_id)
    //.defer(d3.json, 'https://genomevolution.org/coge/api/v1/genomes/' + y_id)
    .defer(d3.json, 'lengths/' + x_id + '.json')
    .defer(d3.json, 'lengths/' + y_id + '.json')
    .await(function(err, ks, x_len, y_len) {
      if (err) {
        console.log(err);
        return;
      }

      X_AXIS_ORGANISM_NAME = x_len.organism.name;
      Y_AXIS_ORGANISM_NAME = y_len.organism.name;

      var ksData = ksTextToObjects(ks);
      var xCumLenMap = lengthsToCumulativeBPCounts(x_len.chromosomes);
      var yCumLenMap = lengthsToCumulativeBPCounts(y_len.chromosomes);
      var inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);

      var ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
      console.log('Total synteny dots:', ksDataObject.currentData().raw.length);
      cb(ksDataObject);
    });
};

function ksTextToObjects(text) {
  /* .ks files are delimited with a combination of tabs and double bars. */
  var csv = text.replace(/\|\|/g, ',').replace(/\t/g, ',').replace(' ', '');
  var ksLines = _.compact(csv.split('\n'));
  return _.chain(ksLines)
    .reject(function(line) {
      return line[0] === '#';
    })
    .map(ksLineToSyntenyDot)
    .filter(function(line) {
      return isFinite(line.logks) && isFinite(line.logkn);
    })
    .value();
}

function ksLineToSyntenyDot(line) {
  var fields = line.split(',');
  return {
    ks: Number(fields[0]),
    logks: Math.log(Number(fields[0])) / Math.log(10),
    kn: Number(fields[1]),
    logkn: Math.log(Number(fields[1])) / Math.log(10),
    logkskn: (Math.log(Number(fields[0])) - Math.log(Number(fields[1]))) / Math.log(10),
    x_chromosome_id: fields[3],
    y_chromosome_id: fields[15],
    ge: {
      x_relative_offset: Number(fields[10]),
      y_relative_offset: Number(fields[22])
    },
    nt: {
      x_relative_offset: Math.round((Number(fields[4]) + Number(fields[5])) / 2),
      y_relative_offset: Math.round((Number(fields[16]) + Number(fields[17])) / 2)
    }
  };
}

function lengthsToCumulativeBPCounts(len_list) {
  var ntLenList = _.chain(len_list)
    .sortBy('length')
    .reverse()
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.length;
      return map;
    }, {
      total: 0
    })
    .value();

  var geLenList = _.chain(len_list)
    .sortBy('length')
    .reverse()
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.gene_count;
      return map;
    }, {
      total: 0
    })
    .value();

  var nameLenList = _.chain(len_list)
    .sortBy('name')
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.gene_count;
      return map;
    }, {
      total: 0
    })
    .value();

  var geneCounts = _.reduce(len_list, function(map, kv) {
    map[kv.name] = kv.gene_count;
    return map;
  }, {});

  return {
    nt: ntLenList,
    ge: geLenList,
    name: nameLenList,
    gene_counts: geneCounts
  };
}

// Compute absolute BP offset from chromosome and relative offset
function inlineKSData(ks, xmap, ymap) {
  _.each(ks, function(ksObj) {
    var xShift = xmap.nt[ksObj.x_chromosome_id];
    var yShift = ymap.nt[ksObj.y_chromosome_id];
    ksObj.nt.x_relative_offset += xShift;
    ksObj.nt.y_relative_offset += yShift;

    var xNameShift = xmap.name[ksObj.x_chromosome_id];
    var yNameShift = ymap.name[ksObj.y_chromosome_id];
    xShift = xmap.ge[ksObj.x_chromosome_id];
    yShift = ymap.ge[ksObj.y_chromosome_id];
    ksObj.ge.x_relative_offset -= xNameShift;
    ksObj.ge.y_relative_offset -= yNameShift;
    ksObj.ge.x_relative_offset += xShift;
    ksObj.ge.y_relative_offset += yShift;
  });
  return ks;
}

function between(low, high, field) {
  if (field) {
    return function(x) {
      return low <= x[field] && x[field] < high;
    };
  } else {
    return function(x) {
      return low <= x && x < high;
    };
  }
}

function createDataObj(syntenyDots, xmapPair, ymapPair) {
  var xmap = xmapPair.ge;
  var ymap = ymapPair.ge;
  var ret = {};
  console.log(xmap);

  var sortedDots = {};
  var dataFilters = {};

  ret.X_AXIS_ORGANISM_NAME = X_AXIS_ORGANISM_NAME;
  ret.Y_AXIS_ORGANISM_NAME = Y_AXIS_ORGANISM_NAME;

  ret.getXLineOffsets = function() {
    return _.chain(xmap).values().sortBy().value();
  };

  ret.getYLineOffsets = function() {
    return _.chain(ymap).values().sortBy().value();
  };

  var gentMode = 'nt';
  ret.setGEvNTMode = function(mode) {
    gentMode = mode;
    xmap = xmapPair[mode];
    ymap = ymapPair[mode];
    ret.notifyListeners('ge-v-nt-change');
  };

  ret.getGEvNTMode = function() {
    return gentMode;
  };

  ret.setOrder = function(field, descending) {
    syntenyDots = _.sortBy(syntenyDots, field);
    if (descending) {
      syntenyDots.reverse();
    }
    ret.notifyListeners('order-change');
  };

  ret.getXLineNames = function() {
    return filterMapForNames(xmap);
  };

  ret.getYLineNames = function() {
    return filterMapForNames(ymap);
  };

  function filterMapForNames(map) {
    return _.chain(map)
      .pairs()
      // Filter out short names
      //.reject(function(x, i, A) {
      //  return i > 0 && x[1] - A[i-1][1] < NUCLEOTIDE_LOWER_NAME_LIMIT;
      //})
      .sortBy('1')
      .pluck('0')
      .reject(function(x) {
        return x === 'total';
      })
      .value();
  }

  function getFilterFunction() {
    var s = dataFilters.spatial;
    var l = dataFilters.logks;
    var k = dataFilters.logkn;
    var m = dataFilters.logkskn;
    if (s && l) {
      return function(d) {
        return s(d) && l(d);
      };
    }
    if (s) return s;
    if (l) return l;
    return function(d) {
      return (!s || s(d)) && (!l || l(d)) &&
        (!k || k(d)) && (!m || m(d));
    };
  }

  ret.currentData = function currentData() {
    return {
      raw: syntenyDots,
      active: _.filter(syntenyDots, getFilterFunction())
    };
  };

  ret.currentDataSummary = function currentDataSummary(ticks, field) {
    var oldFilters = dataFilters;
    dataFilters = _.omit(dataFilters, field);

    if (!sortedDots[field]) {
      sortedDots[field] = _.sortBy(syntenyDots, field);
    }

    var validPoints = _.filter(sortedDots[field], getFilterFunction());
    dataFilters = oldFilters;

    var diff = ticks[1] - ticks[0];

    var lastLow = 0;
    return _.chain(ticks)
      .map(function(tick) {
        var start = {},
          end = {};
        start[field] = tick;
        end[field] = tick + diff;
        var hi = _.sortedIndex(validPoints, end, field);
        var ret = {
          x: tick,
          dx: diff,
          y: hi - lastLow
        };
        lastLow = hi;
        return ret;
      }).value();
  };

  ret.addSpatialFilter = function(extents, typeHint) {
    dataFilters.spatial = function(dot) {
      return dot[gentMode].x_relative_offset >= extents[0][0] &&
        dot[gentMode].x_relative_offset <= extents[1][0] &&
        dot[gentMode].y_relative_offset >= extents[0][1] &&
        dot[gentMode].y_relative_offset <= extents[1][1];
    };
    ret.notifyListeners(typeHint);
  };

  ret.removeSpatialFilter = function(typeHint) {
    delete dataFilters.spatial;
    ret.notifyListeners(typeHint);
  };

  ret.addDataFilter = function(extent, field, typeHint) {
    dataFilters[field] = between(extent[0], extent[1], field);
    ret.notifyListeners(typeHint || 'data');
  };

  ret.removeDataFilter = function(field, typeHint) {
    delete dataFilters[field];
    ret.notifyListeners('data-stop');
  };

  var listeners = [];
  ret.addListener = function(x) {
    listeners.push(x);
  };

  ret.notifyListeners = function(typeOfChange) {
    _.each(listeners, function(x) {
      x(typeOfChange);
    });
  };

  if (DATA_OP_TIMING) {
    var t = ret.currentData;
    ret.currentData = function() {
      var start = Date.now();
      var x = t();
      console.log('currentData', Date.now() - start);
      return x;
    };

    var s = ret.currentDataSummary;
    ret.currentDataSummary = function(a, b) {
      var start = Date.now();
      var x = s(a, b);
      console.log('currentDataSummary', Date.now() - start);
      return x;
    };
    var r = ret.notifyListeners;
    ret.notifyListeners = function(x) {
      console.log('notifyListeners');
      r(x);
    };
  }
  ret.setOrder('logks', true);
  ret.setGEvNTMode(gentMode);
  return ret;
}

exports.loadksData = loadksData;


},{}],4:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
/*
 * Given a list of
 *
 * [{y: <function value>}]
 *
 * remove all the objects that are not extrema; that is, remove the objects
 * that have a y-value that is not higher than both its neighbor's y-values
 * or lower than both its neighbor's y-values.
 *
 * The first and last point are never removed.
 */
function removeNonExtrema(A) {
  return _.filter(A, function(element, index) {
    if(index === 0 || index === A.length - 1)
      return true;

    var before = A[index - 1].y;
    var here = element.y;
    var after = A[index + 1].y;
    return here > Math.max(before, after) || here < Math.min(before, after);
  });
}

exports.removeNonExtrema = removeNonExtrema;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
(function (global){
'use strict';

var histogram = require('./histogram');
var dotplot = require('./dotplot');
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var d3 = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null);

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

function refreshAutoScale() {
  var radio = document.getElementById('color-options');
  var auto = _.find(radio.children, {
    value: 'auto'
  });
  auto.checked = false;
  auto.click();
}

var _refreshAutoDots;
function refreshAutoDots() {
  _refreshAutoDots();
}

function controller(dataObj) {

  _refreshAutoDots = function() {
    _.each(histograms, function(h) {
      h.refreshAutoScale('autoscale');
    });
  };

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
        newCS = histograms[activeField].getAutoScale();
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
        newCS = histograms[activeField].getAutoScale();
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
  var initialColorScale = colorScales[activeField].rg;

  syntenyPlot = dotplot.synteny('#dotplot', dataObj, 'logks', initialColorScale);
  var histograms = {
    'logks': histogram.histogram('#plot', dataObj, 'logks', initialColorScale),
    'logkn': histogram.histogram('#plot2', dataObj, 'logkn', steelBlueCS),
    'logkskn': histogram.histogram('#plot3', dataObj, 'logkskn', steelBlueCS)
  };
  dataObj.notifyListeners('initial');

  var minLogKs = d3.min(_.pluck(dataObj.currentData().raw, 'logks'));
  var maxLogKs = d3.max(_.pluck(dataObj.currentData().raw, 'logks'));
  var points = _.range(minLogKs, maxLogKs, (maxLogKs - minLogKs) / 20);

  var i = 0;
  var j = 0;
  var count = 0;
  var time = 0;
  var slow = 0;
  setTimeout(function bm() {
    if (j >= points.length) {
      i++;
      j = 0;
    }
    if (i >= points.length) {
      console.log(time, count);
      window.alert("Average brush time: " + (time / count) + ", max: " + slow);
      return;
    }
    if (points[i] < points[j]) {
      var start = Date.now();
//      console.profile();
      histograms.logks.brush.extent([points[i], points[j]]);
      histograms.logks.brush.event(histograms.logks.selection);
//      console.profileEnd();
      var end = Date.now();
      time += end - start;
      slow = Math.max(slow, end - start);
      count++;
    //  console.log(end - start);
    }
    j++;
    setTimeout(bm, 0);
  }, 1000);
}

exports.refreshAutoDots = refreshAutoDots;
exports.refreshAutoScale = refreshAutoScale;
exports.controller = controller;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./dotplot":1,"./histogram":2}],6:[function(require,module,exports){
var sv = require('./synteny-vis');
var main = require('./main');

var refreshAutoDots = sv.refreshAutoDots;
var refreshAutoScale = sv.refreshAutoScale;

switch (window.location.hash) {
  case '#m':
  case '#maize':
    main.loadksData('./data/6807_8082.CDS-CDS.dcmegablast.tdd10.cs0.filtered.dag.all.go_D40_g20_A10.aligncoords.gcoords.ks', '6807', '8082', sv.controller);
    break;

  case '#e':
  case '#ecoli':
    main.loadksData('./data/4241_4242.CDS-CDS.last.tdd10.cs0.filtered.dag.all.go_D20_g10_A5.aligncoords.gcoords.ks', '4241', '4242', sv.controller);
    break;

  case '#a':
  case '#arabidopsis':
    main.loadksData('./data/16911_3068.CDS-CDS.last.tdd10.cs0.filtered.dag.all.go_D20_g10_A5.aligncoords.gcoords.ks', '16911', '3068', sv.controller);
    break;

  default:
  case '#h':
  case '#homo':
    window.location.hash = '#homo';
    main.loadksData('./data/11691_25577.CDS-CDS.last.tdd10.cs0.filtered.dag.all.go_D20_g10_A5.aligncoords.gcoords.ks', '11691', '25577', sv.controller);
    break;
}

window.refreshAutoScale = refreshAutoScale;
window.refreshAutoDots = refreshAutoDots;

},{"./main":3,"./synteny-vis":5}],7:[function(require,module,exports){
exports.getComputedAttr = function getComputedAttr(element, attr) {
  var computed = window.getComputedStyle(element)[attr];
  return parseInt(computed, 10);
};

exports.translate = function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
};


},{}],8:[function(require,module,exports){
'use strict';

exports.getPersistence = function getPersistence() {
  return Number(document.getElementById('persistence').value);
};

},{}]},{},[1,2,3,4,5,6,7,8]);
