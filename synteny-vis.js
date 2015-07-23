/* synteny plot settings */
var syntenyLineStrokeWidth = 2;
var gridLineStrokeWidth = 1;
var syntenyPlotWidth = 600; /* height is computed to maintain aspect ratio */

/* Histogram settings */
var margin = 50; /* padding around graph */
var plotWidth = 600;
var plotHeight = 600;
var numHistogramTicks = 80;
var histogramYScaleTransitionLength = 750;

/* Again -- Don't forget to add a corresponding button in index.html */
var colorScaleRanges = {
  rg: {
    domain: [0, 1],
    range: ['red', 'green']
  },
  rg_quantized: {
    quantized: true,
    domain: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1],
    range: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837']
  },
  ryb_mean: {
    domain: [0, 'mean', 1],
    range: ['#fc8d59', '#ffffbf', '#91bfdb']
  },
  ryb_median: {
    domain: [0, 'median', 1],
    range: ['#fc8d59', '#ffffbf', '#91bfdb']
  },
  rainbow: {
    domain: [0, .20, .35, .5, .75, 1],
    range: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']
  },
  rainbow_quantized: {
    quantized: true,
    domain: [0, .20, .35, .5, .75, 1],
    range: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']
  }
};

// Can be used as array or by bvh/merge stuff
var wholePlot = {
  0: [0, 0],
  1: [1e15, 1e15],
  xmin: 0,
  ymin: 0,
  xmax: 1e15,
  ymax: 1e15
};

function controller(datas, cumulative) {
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
      globals.redraw();
    });


  var field = 'logks';
  var colorScale;

  var data = _.filter(datas, function(d) {
    return isFinite(d[field]);
  });

  var dataExtent = d3.extent(_.pluck(data, field));
  var dataMean = d3.mean(_.pluck(data, field));
  var dataMedian = d3.median(_.pluck(data, field));

  function domainPartition(values) {
    return _.map(values, function(v) {
      if (v === 'mean') {
        var val = dataMean;
      } else if (v === 'median') {
        var val = dataMedian;
      } else {
        var val = dataExtent[0] + v * (dataExtent[1] - dataExtent[0]);
      }
      return val;
    });
  }

  var colorScales = {};
  _.each(_.pairs(colorScaleRanges), function(p) {
    colorScales[p[0]] = p[1].quantized ? d3.scale.quantize() : d3.scale.linear();
    colorScales[p[0]]
      .domain(domainPartition(p[1].domain))
      .range(p[1].range);
  });
  colorScale = colorScales['rg'];

  _.each(data, function(d) {
    d.xmin = d.xmax = d.nt.x_relative_offset;
    d.ymin = d.ymax = d.nt.y_relative_offset;
  });
  var bvh_nodes = bvh_build(data);

  globals.getColorScale = function() {
    return colorScale;
  };
  globals.getSummaryType = function() {
    return order;
  };

  var funcs = [
    synteny('#main', data, cumulative, field),
    //synteny('#main2', data, cumulative, field),
    //synteny('#main3', data, cumulative, field),
    //synteny('#main4', data, cumulative, field),
    histogram('#plot', bvh_nodes, field),
    //histogram('#plot2', bvh_nodes, field),
    //histogram('#plot3', bvh_nodes, field),
    //histogram('#plot4', bvh_nodes, field)
  ];

  globals.filter = function(obj) {
    _.each(funcs, function(o) {
      o.filter(obj);
    })
  };

  globals.redraw = function() {
    _.each(funcs, function(o) {
      o.redraw();
    })
  };

  globals.zoomed = function() {
    _.each(funcs, function(o) {
      o.zoomed();
    })
  };

  globals.setNavigationMode = function(mode) {
    _.each(funcs, function(o) {
      o.setNavigationMode(mode);
    })
  }
}

var globals = {};

function synteny(id, data, cumulative, field) {
  var unselectedClass = 'unselected-' + id.substring(1);

  data = _.sortBy(data, function(d) {
    return d.ks;
  });


  var xCumBPCount = cumulative.xCumBPCount;
  var yCumBPCount = cumulative.yCumBPCount;

  var xTotalBPs = _.last(xCumBPCount);
  var yTotalBPs = _.last(yCumBPCount);
  var height = syntenyPlotWidth;
  var width = syntenyPlotWidth;

  var BPPerPixel = xTotalBPs / width;

  var xExtent = [0, xTotalBPs];
  var yExtent = [0, yTotalBPs];
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
    console.log(invert(brush.extent())[0])
    console.log(invert(brush.extent())[1])
    globals.filter({
      extent: invert(brush.extent()),
      yAxis: false,
      selector: unselectedClass
    });
    resizeBrushBoundary();
  }

  function mainBrushEnd() {
    globals.filter({
      extent: brush.empty() ? wholePlot : invert(brush.extent()),
      yAxis: true,
      selector: unselectedClass
    });
  }

  var brush = d3.svg.brush()
    .x(d3.scale.linear().domain([0, width]).range([0, width]))
    .y(d3.scale.linear().domain([0, height]).range([0, height]))
    .on('brush', mainBrush)
    .on('brushend', mainBrushEnd);

  var svgPre = d3.select(id)
    .attr('width', width)
    .attr('height', height)
    .classed('main', true)
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning
  var svg = svgPre.append('g').attr('id', 'data-group');

  // Grid lines
  svg.append('g').classed('.grid-vertical', true)
    .selectAll('path')
    .data(xCumBPCount).enter().append('path')
    .classed('grid', true)
    .attr('d', function(d) {
      var x = xScale(d);
      var y1 = 0;
      var y2 = height;
      return 'M ' + x + ' ' + y1 + ' L ' + x + ' ' + y2;
    })
    .attr('stroke-width', gridLineStrokeWidth);

  svg.append('g').classed('.grid-horizontal', true)
    .selectAll('path')
    .data(yCumBPCount).enter().append('path')
    .classed('grid', true)
    .attr('d', function(d) {
      var y = yScale(d);
      var x1 = 0;
      var x2 = width;
      return 'M ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y;
    })
    .attr('stroke-width', gridLineStrokeWidth);

  var dataSel;

  function setSyntenyData(lines) {
    var colorScale = globals.getColorScale();

    if (dataSel) {
      dataSel.remove();
    }
    dataSel = svg.selectAll('.synteny')
      .data(lines)
      .enter()
      .append('circle')
      .classed('synteny', true)
      .attr('cx', function(d) {
        return xScaleOriginal(d.nt.x_relative_offset);
      })
      .attr('cy', function(d) {
        return yScaleOriginal(d.nt.y_relative_offset);
      })
      .attr('r', syntenyLineStrokeWidth)
      .style('stroke', 'none')
      .style('fill', function(d) {
        return colorScale(d[field]);
      });

    if (lastSyntenyFilter) {
      filterSyntenyByExtent(lastSyntenyFilter.extent, lastSyntenyFilter.selector);
    }
    if (lastDataFilter) {
      filterSyntenyByData(lastDataFilter.range, lastDataFilter.selField, lastDataFilter.selector);
    }
  }

  svgPre
    .append('g').attr('id', 'brush-group')
    .call(brush);


  setSyntenyData(data);

  var lastScale = 1;

  function zoomed() {
    var t = d3.event.translate;
    var s = d3.event.scale;
    t[0] = Math.min(0, Math.max(-width * s + width, t[0]));
    t[1] = Math.min(0, Math.max(-height * s + height, t[1]));
    // prevents the translate from growing large. This way, you don't 
    // have to "scroll back" onto the canvas if you pan past the edge.
    zoom.translate(t);

    d3.select(id).select('#brush-group')
      .attr("transform", "translate(" + t + ")scale(" + s + ")");
    d3.select(id).select('#data-group')
      .attr("transform", "translate(" + t + ")scale(" + s + ")");

    globals.zoomed();

    // We only update the svg elements that are visible.
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
      .attr('r', syntenyLineStrokeWidth / s);

    svg.selectAll('.grid')
      .style('stroke-width', gridLineStrokeWidth / s);
  }

  var lastDataFilter;

  function filterSyntenyByData(range, selField, selector) {
    lastDataFilter = {
      range: range,
      selField: selField,
      selector: selector
    };
    var cs = globals.getColorScale();
    console.log(selField);
    console.log(range);
    svg.selectAll('.synteny')
      .classed(selector, function(d) {
        return d[selField] > range[1] || d[selField] < range[0];
      });
  }

  var lastSyntenyFilter;

  function filterSyntenyByExtent(e, selector) {
    lastSyntenyFilter = {
      extent: e,
      selector: selector
    }
    svg.selectAll('.synteny').classed(selector, function(d) {
      return d.xmin > e[1][0] || d.xmax < e[0][0] ||
        d.ymin > e[1][1] || d.ymax < e[0][1];
    });
  }

  function filter(obj) {
    if (obj.extent) {
      filterSyntenyByExtent(obj.extent, obj.selector);
    } else if (obj.data) {
      filterSyntenyByData(obj.data, obj.field, obj.selector);
    }
  }

  var lastOrder = 'minimum';
  var minSort = data;
  var maxSort = _.sortBy(data, function(d) {
    return -d.ks
  });

  function reColorSyntenyLines() {
    var colorScale = globals.getColorScale();
    var order = globals.getSummaryType();
    if (order !== lastOrder) {
      if (order === 'minimum') {
        setSyntenyData(minSort);
      } else {
        setSyntenyData(maxSort);
      }
      lastOrder = order;
    }
    svg.selectAll('.synteny').transition().duration(500)
      .style('fill', function(d) {
        return colorScale(d[field]);
      });
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
    filter: filter,
    redraw: reColorSyntenyLines,
    zoomed: mainBrush,
    setNavigationMode: setNavigationMode
  };
}

function histogram(id, bvh_nodes, field) {
  /* Histogram */
  var unselectedClass = 'unselected-' + id.substring(1);

  var dataExtent = d3.extent(_.pluck(bvh_find(bvh_nodes, wholePlot), field));

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
    if (plotBrush.empty()) return;
    var e = plotBrush.extent();
    globals.filter({
      data: e,
      field: field,
      selector: unselectedClass
    });
  }

  function plotBrushEnd() {
    if (plotBrush.empty()) {
      globals.filter({
        data: dataExtent,
        field: field,
        selector: unselectedClass
      });
    }
  }

  var plotBrush = d3.svg.brush()
    .on('brush', plotBrushBrush)
    .on('brushend', plotBrushEnd);

  lastYExtent = [0, bvh_nodes.data.length];
  var xPlotScale = d3.scale.linear()
    .domain(dataExtent)
    .range([margin, plotWidth - margin]);
  var yPlotScale;

  plot.selectAll('.dataBars')
    .data(xPlotScale.ticks(numHistogramTicks).slice(1))
    .enter()
    .append('rect').classed('dataBars', true);
  computeBins(bvh_nodes, field, xPlotScale.ticks(numHistogramTicks));

  var lastYExtent;

  var filters = {}

  function updatePlot(extent, shouldRescaleYAxis, selector) {
    var e = extent;

    var bbox = {
      xmin: e[0][0],
      ymin: e[0][1],
      xmax: e[1][0],
      ymax: e[1][1]
    };

    filters[selector] = bbox;

    // Take the intersection of all the filters
    var intersection = _.reduce(filters, function(a, b) {
      return {
        xmin: Math.max(a.xmin, b.xmin),
        ymin: Math.max(a.ymin, b.ymin),
        xmax: Math.min(a.xmax, b.xmax),
        ymax: Math.min(a.ymax, b.ymax)
      };
    }, {
      xmin: 0,
      ymin: 0,
      xmax: 1e20,
      ymax: 1e20
    });

    if (intersection.xmin < intersection.xmax &&
      intersection.ymin < intersection.ymax) {
      filteredData = bvh_find_summary(bvh_nodes, intersection);
    } else {
      filteredData = bvh_find_summary(bvh_nodes, {
        xmin: 0,
        ymin: 0,
        xmax: 0,
        ymax: 0
      });
    }


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

    function updatePlotAttrs(selection) {
      var colorScale = globals.getColorScale();
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
          return plotHeight - margin - yPlotScale(d.y);
        })
        .attr('fill', function(d) {
          return colorScale(d.x + d.dx / 2);
        });
    }

    plot.selectAll('.dataBars').data(filteredData)
      .call(updatePlotAttrs);

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
        .call(updatePlotAttrs);
    }
  }

  updatePlot(wholePlot, true);

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

  return {
    filter: filter,
    zoomed: plotBrushBrush,
    redraw: reColorDataBars,
    setNavigationMode: function() {}
  };
}

