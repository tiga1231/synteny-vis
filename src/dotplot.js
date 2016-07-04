'use strict';

const utils = require('./utils');
const _ = require('lodash');
const d3 = require('d3');
const transform = require('svg-transform');

const {
  SYNTENY_MARGIN,
  CIRCLE_RADIUS,
  UNSELECTED_DOT_FILL,
  NUM_COLOR_SCALE_INTERPOLATION_SAMPLES,
  GEVO_CLICK_PROXIMITY_THRESHOLD_PIXELS,
  DOTPLOT_COLOR_TRANS_LEN,
  MAXIMIZE_WIDTH,
  MIN_TEXT_GAP,
  ROUNDING_FACTOR
} = require('constants');

function synteny(id, dataObj, field, initialColorScale, meta) {
  var xExtent = d3.extent(dataObj.getXLineOffsets());
  var yExtent = d3.extent(dataObj.getYLineOffsets());
  var dataAspectRatio = yExtent[1] / xExtent[1];

  const baseID = id.substring(1);
  const svgElement = document.getElementById(baseID);

  const getWidth = () => {
    return utils.getComputedAttr(svgElement, 'width') - 2 * SYNTENY_MARGIN;
  };
  const getHeight = () => {
    return utils.getComputedAttr(svgElement, 'height') - 2 * SYNTENY_MARGIN;
  };

  var xScale = d3.scale.linear().domain(xExtent).range([0, getWidth()]);
  var yScale = d3.scale.linear().domain(yExtent).range([getHeight(), 0]);

  const darknessOfTextGaps = function(values, scale) {
    return _.zipWith(values, _.tail(values), function(a, b) {
      return b ? Math.abs(scale(b) - scale(a)) : 10000;
    })
      .map(v => v > MIN_TEXT_GAP ? 1 : v / MIN_TEXT_GAP)
      .map(v => 255 - Math.floor(v * 256))
      .map(v => Math.min(v, 245));
  };

  const filterTextGaps = function(values, scale) {
    return values.reduce(function(out, next) {
      const first = out.length === 0;
      const gap = Math.abs(scale(next) - scale(_.last(out)));
      const gap_has_elapsed = gap > MIN_TEXT_GAP;
      if (first || gap_has_elapsed)
        out.push(next);
      return out;
    }, []);
  };

  const genGeVOLink = (aDbId, bDbId) =>
    'http://geco.iplantcollaborative.org/asherkhb/coge/GEvo.pl?' +
    `fid1=${aDbId};fid2=${bDbId};apply_all=${50000};num_seqs=${2}`;

  const getSingleGeVoDescription = id =>
  fetch(`https://genomevolution.org/coge/api/v1/features/${id}`)
    .then(r => r.json());

  const getGeVODescription = (aDbId, bDbId) => Promise.all([
    getSingleGeVoDescription(aDbId),
    getSingleGeVoDescription(bDbId)
  ])
    .then(([x, y]) => {
      return {x_name: x.names.join(', '), y_name: y.names.join(', ')};
    });

  let highlighted;
  const updateGeVOLink = function(x, y) {
    const distance = d => {
      const x_component = Math.pow(d.x_relative_offset - x, 2);
      const y_component = Math.pow(d.y_relative_offset - y, 2);
      return Math.sqrt(x_component + y_component);
    };
    const point = _.minBy(dataObj.currentData().raw, distance);
    highlighted = point;

    const ratio = (xScale.range()[1] - xScale.range()[0]) /
      (xScale.domain()[1] - xScale.domain()[0]);
    if (distance(point) * ratio < GEVO_CLICK_PROXIMITY_THRESHOLD_PIXELS) {
      d3.select('#gevo-link')
        .attr('href', genGeVOLink(point.x_feature_id, point.y_feature_id));
      getGeVODescription(point.x_feature_id, point.y_feature_id)
        .then(({x_name, y_name}) => {
          d3.select('#gevo-link-xname')
            .text(`Name (${meta.x_name}): ${x_name}`);
          d3.select('#gevo-link-yname')
            .text(`Name (${meta.y_name}): ${y_name}`);
        });
    }

    setSyntenyData();
  };

  const makeLabels = function() {

    const xFilter = x => (0 <= xScale(x) && xScale(x) <= getWidth());
    const yFilter = y => (0 <= yScale(y) && yScale(y) <= getHeight());

    const tempXOffsets = _.filter(xOffsets, xFilter);
    const tempYOffsets = _.filter(yOffsets, yFilter);
    const tempXGaps = filterTextGaps(_.filter(xMidpoints, xFilter), xScale);
    const tempYGaps = filterTextGaps(_.filter(yMidpoints, yFilter), yScale);

    xGridLines.tickValues(tempXOffsets);
    xLabels.tickValues(tempXGaps);
    yGridLines.tickValues(tempYOffsets);
    yLabels.tickValues(tempYGaps);

    xAxisGapsGroup.call(xLabels);
    yAxisGapsGroup.call(yLabels);
    xAxisLineGroup.call(xGridLines);
    yAxisLineGroup.call(yGridLines);

    const tempXOffsetDarknesses = darknessOfTextGaps(tempXOffsets, xScale);
    const tempYOffsetDarknesses = darknessOfTextGaps(tempYOffsets, yScale);

    xAxisLineGroup.selectAll('line')
      .data(tempXOffsetDarknesses)
      .style('stroke', d => d3.rgb(d, d, d));

    yAxisLineGroup.selectAll('line')
      .data(tempYOffsetDarknesses)
      .style('stroke', d => d3.rgb(d, d, d));

  };

  var zoom = d3.behavior.zoom()
    .x(xScale).y(yScale)
    .scaleExtent([1, 100])
    .on('zoom', function() {
      var t = d3.event.translate;
      var s = d3.event.scale;
      t[0] = Math.min(0, Math.max(-getWidth() * s + getWidth(), t[0]));
      t[1] = Math.min(0, Math.max(-getHeight() * s + getHeight(), t[1]));
      // prevents the translate from growing large. This way, you don't 
      // have to "scroll back" onto the canvas if you pan past the edge.
      zoom.translate(t);

      brushGroup.attr('transform', transform([{translate: t}, {scale: s}]));

      resizeBrushBoundary();
      makeLabels();
      drawBG();
      setSyntenyData();
    });

  function resizeBrushBoundary() {
    var scaling = zoom.scale();
    var corners = ['.nw', '.ne', '.se', '.sw'];
    var vertical = ['.e', '.w'];
    var horizontal = ['.n', '.s'];
    var horizontalRescale = corners.concat(vertical);
    var verticalRescale = corners.concat(horizontal);

    _.map(horizontalRescale, function(name) {
      d3.select('.resize' + name).select('rect')
        .attr('width', 6 / scaling).attr('x', -3 / scaling);
    });

    _.map(verticalRescale, function(name) {
      d3.select('.resize' + name).select('rect')
        .attr('height', 6 / scaling).attr('y', -3 / scaling);
    });
  }

  /* We are copying the scale here because brushes do not play nice with
   * zooming. All sorts of nasty things happen when the scales get changed
   * underneath a brush. */
  const originalXScale = xScale.copy();
  const originalYScale = yScale.copy();
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
        const mouse = d3.mouse(this);
        const x = originalXScale.invert(mouse[0]);
        const y = originalYScale.invert(mouse[1]);
        updateGeVOLink(x, y);
      } else {
        dataObj.addSpatialFilter(brush.extent(), 'spatial-stop');
        resizeBrushBoundary();
      }
    });

  const canvas = d3.select(id + '-canvas')
    .attr('width', getWidth())
    .attr('height', getHeight())
    .style('left', SYNTENY_MARGIN)
    .style('top', SYNTENY_MARGIN);

  const backCanvas = d3.select(id + '-canvas-background')
    .attr('width', getWidth())
    .attr('height', getHeight())
    .style('left', SYNTENY_MARGIN)
    .style('top', SYNTENY_MARGIN);

  const context = canvas.node().getContext('2d');
  const background = backCanvas.node().getContext('2d');

  var svg = d3.select(id);

  var TEXT_OFFSET = 35;
  var TEXT_BOX_HEIGHT = 25;
  svg.append('text')
    .attr('x', (getWidth() + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (getWidth() + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN + getHeight() + TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(meta.x_name);

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -2 * (getHeight() + 2 * SYNTENY_MARGIN) / 3)
    .attr('width', (getHeight() + 2 * SYNTENY_MARGIN) / 3)
    .attr('y', SYNTENY_MARGIN - TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(meta.y_name);

  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'plot-clip-box')
    .append('rect')
    .attr('x', 0)
    .attr('width', getWidth())
    .attr('y', 0)
    .attr('height', getHeight())
    .attr('fill', 'black');

  const midpoints = function(points) {
    return _.zipWith(_.initial(points), _.tail(points), (a, b) => (a + b) / 2);
  };

  var xOffsets = dataObj.getXLineOffsets();
  var xMidpoints = midpoints(xOffsets);

  const xOffsetToName = _.fromPairs(_.zip(xMidpoints, dataObj.getXLineNames()));
  const xAxisBase = () => d3.svg.axis().scale(xScale).orient('bottom');

  var xGridLines = xAxisBase()
    .tickFormat('')
    .tickSize(-getHeight());

  var xLabels = xAxisBase()
    .tickFormat(x => xOffsetToName[x])
    .tickSize(0);

  const transformer = transform([
    {translate: [SYNTENY_MARGIN, getHeight() + SYNTENY_MARGIN]}
  ]);
  var xAxisWrapper = svg.append('g').attr('transform', transformer);
  var xAxisGapsGroup = xAxisWrapper.append('g');
  var xAxisLineGroup = xAxisWrapper.append('g');

  var yOffsets = dataObj.getYLineOffsets();
  var yMidpoints = midpoints(yOffsets);

  const yOffsetToName = _.fromPairs(_.zip(yMidpoints, dataObj.getYLineNames()));
  const yAxisBase = () => d3.svg.axis().scale(yScale).orient('left');

  var yGridLines = yAxisBase()
    .tickFormat('')
    .tickSize(-getWidth());

  var yLabels = yAxisBase()
    .tickFormat(x => yOffsetToName[x])
    .tickSize(0);

  var yAxisWrapper = svg.append('g')
    .attr('transform',
      transform([{translate: [SYNTENY_MARGIN, SYNTENY_MARGIN]}]));
  var yAxisGapsGroup = yAxisWrapper.append('g');
  var yAxisLineGroup = yAxisWrapper.append('g');

  makeLabels();

  svg = svg
    .append('g')
    .attr('transform',
      transform([{translate: [SYNTENY_MARGIN, SYNTENY_MARGIN]}]))
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning

  var brushGroup = svg
    .append('g').attr('clip-path', 'url(#plot-clip-box)')
    .append('g').attr('id', 'brush-group')
    .call(brush);

  var colorScale = initialColorScale;

  function drawBG() {
    var allDots = dataObj.currentData().raw;
    background.clearRect(0, 0, getWidth(), getHeight());
    background.fillStyle = UNSELECTED_DOT_FILL;
    _.each(allDots, function(d) {
      const cx = xScale(d.x_relative_offset);
      const cy = yScale(d.y_relative_offset);

      if (cx < 0 || cx > getWidth() || cy < 0 || cy > getHeight())
        return;

      background.fillRect(cx - CIRCLE_RADIUS,
        cy - CIRCLE_RADIUS,
        CIRCLE_RADIUS,
        CIRCLE_RADIUS);
    });
  }

  function draw(elapsedMS, initialColorScale, finalColorScale) {
    var start = Date.now();

    var intermediateColorScale;
    var t = Math.min(
      (DOTPLOT_COLOR_TRANS_LEN - elapsedMS) / DOTPLOT_COLOR_TRANS_LEN, 1);
    intermediateColorScale = interpolateScales(initialColorScale,
      finalColorScale,
      t);

    var allData = dataObj.currentData();
    var activeDots = allData.active;

    //console.log('Time after collecting data', Date.now() - start);
    start = Date.now();

    context.clearRect(0, 0, getWidth(), getHeight());

    /* On top, active dots */
    var groups = [];
    var index = 0;

    const rounded = x => {
      return Math.floor(x[field] * ROUNDING_FACTOR) / ROUNDING_FACTOR;
    };
    while (index < activeDots.length) {
      var low = index;
      var val = rounded(activeDots[index]);
      index = _.sortedLastIndexBy(activeDots, {
        [field]: val
      }, x => -rounded(x));
      groups.push([low, index]);
    }

    _.each(groups, function([loIndex, hiIndex]) {
      context.fillStyle = intermediateColorScale(rounded(activeDots[loIndex]));
      for (var i = loIndex; i < hiIndex; i++) {
        const d = activeDots[i];
        const cx = xScale(d.x_relative_offset);
        const cy = yScale(d.y_relative_offset);

        if (cx < 0 || cx > getWidth() || cy < 0 || cy > getHeight())
          continue;

        context.fillRect(cx - CIRCLE_RADIUS,
          cy - CIRCLE_RADIUS,
          CIRCLE_RADIUS,
          CIRCLE_RADIUS);
      }
    });

    if (highlighted) {
      context.beginPath();
      context.strokeStyle = 'red';
      context.arc(xScale(highlighted.x_relative_offset),
        yScale(highlighted.y_relative_offset), 10, 0, 2 * Math.PI);
      context.stroke();
    }

    const diff = Date.now() - start;
    //console.log('Start of call to end of draw call:', diff);
    if (elapsedMS > 0) {
      setTimeout(draw, 0, elapsedMS - diff, initialColorScale, finalColorScale);
    }
  }

  function interpolateScales(a, b, t) {
    const aDomain = a.domain();
    const bDomain = b.domain();
    const min = Math.min(aDomain[0], bDomain[0]);
    const max = Math.max(aDomain[aDomain.length - 1],
      bDomain[bDomain.length - 1]);
    const step = (max - min) / NUM_COLOR_SCALE_INTERPOLATION_SAMPLES;
    const domain = _.range(min, max + 1, step);
    const range = _.map(domain, function(input) {
      return d3.interpolateRgb(a(input), b(input))(t);
    });
    return d3.scale.linear().domain(domain).range(range);
  }

  function setSyntenyData() {
    draw(0, colorScale, colorScale);
  }
  dataObj.addListener(setSyntenyData);
  drawBG();
  setSyntenyData();

  function setNavigationMode(mode) {
    if (mode === 'pan') {
      d3.select(id).select('#brush-group').on('mousedown.brush', null);
      d3.select(id).select('#zoom-group').call(zoom);
      d3.select(id).select('#brush-group').style('pointer-events', null);
      d3.select(id).select('#zoom-group').style('pointer-events', 'all');
      d3.select(id).select('#brush-group').on('click', function() {
        const mouse = d3.mouse(this);
        const x = originalXScale.invert(mouse[0]);
        const y = originalYScale.invert(mouse[1]);
        updateGeVOLink(x, y);
      });
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

// Local Variables:
// mode: js2
// js2-basic-offset: 8
// End:
