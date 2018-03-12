import utils from './utils';
import d3 from 'd3';
import transform from 'svg-transform';
import { getSingleFeatureDescription } from './coge-util';
import { shortenString } from './label-utils';
const { minBy, zipObject, zipWith } = utils;
import { getController } from 'interactionController';

import {
  SYNTENY_MARGIN,
  CIRCLE_RADIUS,
  UNSELECTED_DOT_FILL,
  NUM_COLOR_SCALE_INTERPOLATION_SAMPLES,
  GEVO_CLICK_PROXIMITY_THRESHOLD_PIXELS,
  MAX_SHORT_LABEL_LENGTH,
  DOTPLOT_COLOR_TRANS_LEN,
  MAXIMIZE_WIDTH,
  MIN_GRID_LINE_GAP,
  ESTIMATED_CHAR_WIDTH_IN_PX,
  ESTIMATED_CHAR_HEIGHT_IN_PX,
  ROUNDING_FACTOR
} from 'constants';

var rawSeenByLux;

function synteny(id, dataObj, field, initialColorScale, meta) {

  var xExtent = d3.extent(dataObj.getXLineOffsets());
  var yExtent = d3.extent(dataObj.getYLineOffsets());
  var dataAspectRatio = yExtent[1] / xExtent[1];

  const baseID = id.substring(1);
  const svgElement = document.getElementById(baseID);

  const getComputedWidth = () => {
    return utils.getComputedAttr(svgElement, 'width') - 2 * SYNTENY_MARGIN;
  };
  const getComputedHeight = () => {
    return utils.getComputedAttr(svgElement, 'height') - 2 * SYNTENY_MARGIN;
  };

  const getWidth = () => {
    const screenRatio = getComputedHeight() / getComputedWidth();
    if(screenRatio > dataAspectRatio) {
      // We are too tall. Use the entire width.
      return getComputedWidth();
    } else {
      // We are too wide. Only use as much width as we have height for.
      return getComputedHeight() / dataAspectRatio;
    }
  };

  const getHeight = () => {
    const screenRatio = getComputedHeight() / getComputedWidth();
    if(screenRatio > dataAspectRatio) {
      // We are too tall. Only use as much height as we have width for.
      return getComputedWidth() * dataAspectRatio;
    } else {
      // We are too wide. Use the entire height.
      return getComputedHeight();
    }
  };

  const CANVAS_X_OFFSET = SYNTENY_MARGIN + getComputedWidth() - getWidth();
  const CANVAS_Y_OFFSET = SYNTENY_MARGIN + getComputedHeight() - getHeight();

  var xScale = d3.scale.linear().domain(xExtent).range([0, getWidth()]);
  var yScale = d3.scale.linear().domain(yExtent).range([getHeight(), 0]);


  const darknessOfTextGaps = function(values, scale) {
    return zipWith(function(a, b) {
      return b ? Math.abs(scale(b) - scale(a)) : 10000;
    }, values, values.slice(1))
      .map(v => v > MIN_GRID_LINE_GAP ? 1 : v / MIN_GRID_LINE_GAP)
      .map(v => 255 - Math.floor(v * 256))
      .map(v => Math.min(v, 245));
  };


  const filterTextGaps = function(values, scale, labelSize) {
    return values.reduce(function(out, next) {
      if(out.length === 0) return [next];
      const last = out[out.length - 1];
      const available = Math.abs(scale(next) - scale(last));
      const required = (labelSize(next) + labelSize(last)) / 2;
      if (available > required) {
        out.push(next);
      }
      return out;
    }, []);
  };


  const getFeatureDescription = (aDbId, bDbId) => Promise.all([
    getSingleFeatureDescription(aDbId),
    getSingleFeatureDescription(bDbId)
  ])
    .then(([x, y]) => {
      return {x_name: x.names.join(', '), y_name: y.names.join(', ')};
    });


  let highlighted;
  const updateGeVOLink = function(x, y) {
    return;
    // const distance = d => {
    //   const x_component = Math.pow(d.x_relative_offset - x, 2);
    //   const y_component = Math.pow(d.y_relative_offset - y, 2);
    //   return Math.sqrt(x_component + y_component);
    // };
    // const point = minBy(distance, dataObj.currentData().raw);
    // highlighted = point;

    // const ratio = (xScale.range()[1] - xScale.range()[0]) /
    //   (xScale.domain()[1] - xScale.domain()[0]);
    // if (distance(point) * ratio < GEVO_CLICK_PROXIMITY_THRESHOLD_PIXELS) {
    //   d3.select('#gevo-link')
    //     .text('Compare in GEvo >>>')
    //     .attr('onclick', () => {
    //       const { x_feature_id, y_feature_id } = point;
    //       const { gen_coge_seq_link } = meta;
    //       const link = gen_coge_seq_link(x_feature_id, y_feature_id);
    //       return `window.open('${link}')`;
    //     });
    //   getFeatureDescription(point.x_feature_id, point.y_feature_id)
    //     .then(({x_name, y_name}) => {
    //       d3.select('#gevo-link-xname')
    //         .text(`${meta.x_name}: ${x_name}`);
    //       d3.select('#gevo-link-yname')
    //         .text(`${meta.y_name}: ${y_name}`);
    //     });
    // }

    // setSyntenyData();
  };

  const xLabelSize = offset =>
    xOffsetToName[offset].short.length * ESTIMATED_CHAR_WIDTH_IN_PX;

  const yLabelSize = () => ESTIMATED_CHAR_HEIGHT_IN_PX;

  const makeLabels = function() {

    const width = getWidth();
    const height = getHeight();
    const xFilter = x => (0 <= xScale(x) && xScale(x) <= width);
    const yFilter = y => (0 <= yScale(y) && yScale(y) <= height);

    const xGridOffsets = xOffsets.filter(xFilter);
    const yGridOffsets = yOffsets.filter(yFilter);

    const xTextOffsets = filterTextGaps(xMidpoints.filter(xFilter),
                                        xScale,
                                        xLabelSize);
    const yTextOffsets = filterTextGaps(yMidpoints.filter(yFilter),
                                        yScale,
                                        yLabelSize);

    xGridLines.tickValues(xGridOffsets);
    xLabels.tickValues(xTextOffsets);
    yGridLines.tickValues(yGridOffsets);
    yLabels.tickValues(yTextOffsets);

    const addXHoverLabel = (x, el) => {
      const { short, full } = xOffsetToName[x];

      // If the label fits, no need to do anything on hover.
      if(full.length === short.length) {
        return;
      }

      d3.select(el)
        .append('tspan')
        .attr('x', 0)
        .attr('y', 2 * ESTIMATED_CHAR_HEIGHT_IN_PX)
        .text(full);
    };

    const removeXHoverLabel = (x, el) => {
      d3.select(el).selectAll('tspan').remove();
    };

    xAxisGapsGroup.call(xLabels);
    xAxisGapsGroup.selectAll('text')
      .each(function(offset) {
        this.onmouseenter = () => addXHoverLabel(offset, this);
        this.onmouseleave = () => removeXHoverLabel(offset, this);
      });

    yAxisGapsGroup.call(yLabels);
    yAxisGapsGroup.selectAll('text')
      .each(function(offset) {
        this.onmouseenter = () => {
          yOffsetToName[offset].hover = true;
          yAxisGapsGroup.call(yLabels);
        };
        this.onmouseleave = () => {
          yOffsetToName[offset].hover = false;
          yAxisGapsGroup.call(yLabels);
        };
      });

    xAxisLineGroup.call(xGridLines);
    yAxisLineGroup.call(yGridLines);

    const tempXOffsetDarknesses = darknessOfTextGaps(xGridOffsets, xScale);
    const tempYOffsetDarknesses = darknessOfTextGaps(yGridOffsets, yScale);

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
      // drawBG();
      xMin.set(xScale.domain()[0]);
      xMax.set(xScale.domain()[1]);
      yMin.set(yScale.domain()[0]);
      yMax.set(yScale.domain()[1]);
      Lux.Scene.invalidate();
      setSyntenyData();
    });

  function resizeBrushBoundary() {
    var scaling = zoom.scale();
    var corners = ['.nw', '.ne', '.se', '.sw'];
    var vertical = ['.e', '.w'];
    var horizontal = ['.n', '.s'];
    var horizontalRescale = corners.concat(vertical);
    var verticalRescale = corners.concat(horizontal);

    horizontalRescale.forEach(function(name) {
      d3.select('.resize' + name).select('rect')
        .attr('width', 6 / scaling).attr('x', -3 / scaling);
    });

    verticalRescale.forEach(function(name) {
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
      Lux.Scene.invalidate();
      if (!brush.empty()) {
        brushX.set(vec.make([brush.extent()[0][0],
                             brush.extent()[1][0]]));
        brushY.set(vec.make([brush.extent()[0][1],
                             brush.extent()[1][1]]));
        dataObj.addSpatialFilter(brush.extent(), 'spatial');
        resizeBrushBoundary();
      } else {
        brushX.set(vec.make(xScale.domain()));
        brushY.set(vec.make(yScale.domain()));
      }
    })
    .on('brushend', function() {
      Lux.Scene.invalidate();
      if (brush.empty()) {
        brushX.set(vec.make(xScale.domain()));
        brushY.set(vec.make(yScale.domain()));
        dataObj.removeSpatialFilter('spatial-stop');
        const mouse = d3.mouse(this);
        const x = originalXScale.invert(mouse[0]);
        const y = originalYScale.invert(mouse[1]);
        updateGeVOLink(x, y);
      } else {
        brushX.set(vec.make([brush.extent()[0][0],
                             brush.extent()[1][0]]));
        brushY.set(vec.make([brush.extent()[0][1],
                             brush.extent()[1][1]]));
        dataObj.addSpatialFilter(brush.extent(), 'spatial-stop');
        resizeBrushBoundary();
      }
    });

  const dpr = window.devicePixelRatio;
  
  const canvas = d3.select(id + '-canvas')
    .attr('width', getWidth())
    .attr('height', getHeight())
    .style('width', String(getWidth()) + 'px')
    .style('height', String(getHeight()) + 'px')
    .style('left', CANVAS_X_OFFSET)
    .style('top', CANVAS_Y_OFFSET);
    //.style('left', SYNTENY_MARGIN)
    //.style('top', SYNTENY_MARGIN);

  const backCanvas = d3.select(id + '-canvas-background')
    .attr('width', getWidth() * dpr)
    .attr('height', getHeight() * dpr)
    .style('width', String(getWidth()) + 'px')
    .style('height', String(getHeight()) + 'px')
    //.style('left', SYNTENY_MARGIN)
    //.style('top', SYNTENY_MARGIN);
    .style('left', CANVAS_X_OFFSET)
    .style('top', CANVAS_Y_OFFSET);

  var gl = Lux.init({
    canvas: canvas.node(),
    clearDepth: 1.0,
    clearColor: [0,0,0,0],
    attributes: {
      alpha: true,
      depth: true
    }
  });
  // const context = Lux.init(canvas.node().getContext('2d');
  const background = backCanvas.node().getContext('2d');

  var raw = dataObj.currentData().raw;
  rawSeenByLux = raw;
  raw.sort((a, b) => b.logks - a.logks);
  var xOffsetArray = new Float32Array(raw.map(e => e.x_relative_offset));
  var yOffsetArray = new Float32Array(raw.map(e => e.y_relative_offset));
  var logKsArray = new Float32Array(raw.map(e => e.logks));
  var enabledArray = new Float32Array(raw.length);
  for (var i=0; i<raw.length; ++i) {
    enabledArray[i] = 1.0;
  }

  var rb = Lux.renderBuffer({
    clearColor: [0,0,0,0],
    width: getWidth() * dpr,
    height: getHeight() * dpr,
    type: gl.FLOAT
  });

  var xBuffer = Shade(Lux.attributeBuffer({
    vertexArray: xOffsetArray,
    itemSize: 1
  }));
  var yBuffer = Shade(Lux.attributeBuffer({
    vertexArray: yOffsetArray,
    itemSize: 1
  }));
  var vBuffer = Shade(Lux.attributeBuffer({
    vertexArray: logKsArray,
    itemSize: 1
  }));

  //flag of whether a point is selected and shown 
  var eAttributeBuffer = Lux.attributeBuffer({
    vertexArray: enabledArray,
    itemSize: 1
  });

  

  var eBuffer = Shade(eAttributeBuffer);
  var vExtent = d3.extent(logKsArray);

  var xMin = Shade.parameter('float'), xMax = Shade.parameter('float');
  var yMin = Shade.parameter('float'), yMax = Shade.parameter('float');
  xMin.set(xScale.domain()[0]);
  xMax.set(xScale.domain()[1]);
  yMin.set(yScale.domain()[0]);
  yMax.set(yScale.domain()[1]);

  var selectionInactive = Shade.parameter('bool', true);
  var brushX = Shade.parameter('vec2', vec.make(xScale.domain()));
  var brushY = Shade.parameter('vec2', vec.make(yScale.domain()));
  var brushV = Shade.parameter('vec2', vec.make(vExtent));
  
  var luxXScale = Shade.Scale.linear({ domain: [xMin, xMax],
                                       range: vec2.make(xScale.range()) });
  var luxYScale = Shade.Scale.linear({ domain: [yMin, yMax],
                                       range: vec2.make(yScale.range()) });
  var canvasXScale = Shade.Scale.linear(
    { domain: [0, backCanvas.node().width/dpr],
      range: [-1, 1] });
  var canvasYScale = Shade.Scale.linear(
    { domain: [0, backCanvas.node().height/dpr],
      range: [1, -1] });
                                   
  var bgActor = Lux.Marks.dots({
    elements: xOffsetArray.length,
    position: Shade.vec(canvasXScale(luxXScale(xBuffer)),
                        canvasYScale(luxYScale(yBuffer))),
    fillColor: Shade.color('#ccc'),
    strokeColor: Shade.color('#ccc', 0),
    pointDiameter: CIRCLE_RADIUS,
    strokeWidth: 0
  });

  var luxColorScale = Shade.Scale.linear({
    domain: initialColorScale.domain(),
    range: initialColorScale.range().map(c => Shade.color(c))
  });
  var dotColor = luxColorScale(vBuffer);
  var unselected = dotColor.mul(Shade.vec(1,1,1,0));
  
  var actor = Lux.Marks.dots({
    elements: xOffsetArray.length,
    mode: Lux.DrawingMode.additive,
    position: Shade.vec(canvasXScale(luxXScale(xBuffer)),
                        canvasYScale(luxYScale(yBuffer))),
    // fillColor: Shade.ifelse(
    //   xBuffer.ge(brushX.x())
    //     .and(xBuffer.le(brushX.y()))
    //     .and(yBuffer.ge(brushY.x()))
    //     .and(yBuffer.le(brushY.y()))
    //     .and(vBuffer.ge(brushV.x()))
    //     .and(vBuffer.le(brushV.y())),
    //   dotColor,
    //   unselected),
    fillColor: Shade.ifelse(
      xBuffer.ge(brushX.x())
        .and(xBuffer.le(brushX.y()))
        .and(yBuffer.ge(brushY.x()))
        .and(yBuffer.le(brushY.y()))
        .and(vBuffer.ge(brushV.x()))
        .and(vBuffer.le(brushV.y()))
        .and(eBuffer.eq(1.0)),
      Shade.vec(Shade.exp(vBuffer), 0, 0, 1),
      unselected),
    strokeColor: unselected,
    pointDiameter: CIRCLE_RADIUS,
    strokeWidth: 0
  });

  rb.scene.add(actor);

  Lux.Scene.add(bgActor);
  Lux.Scene.add(Lux.actorList([rb.scene, rb.screenActor({
    mode: Lux.DrawingMode.overNoDepth,
    texelFunction: function(texelAccessor) {
      var color = texelAccessor();
      var count = color.a();
      var sum_ks = color.r();
      var arithmetic_avg_ks = Shade.log(sum_ks.div(count));
      return count.le(0.5)
              .ifelse(Shade.vec(0,0,0,0), luxColorScale(arithmetic_avg_ks));
      // var c = color.a();
      // return c.le(1).ifelse(color, color.div(c));
    }
  })]));
  background.scale(dpr,dpr);

  var svg = d3.select(id);


  //axis titles
  var TEXT_OFFSET = 50;
  var TEXT_BOX_HEIGHT = 25;

  svg.append('text')
    ///.attr('x', (getWidth() + 2 * SYNTENY_MARGIN) / 3)
    .attr('x', CANVAS_X_OFFSET + getWidth()/3 )
    .attr('width', (getWidth() + 2 * SYNTENY_MARGIN) / 3)
    ///.attr('y', SYNTENY_MARGIN + getHeight() + TEXT_OFFSET)
    .attr('y', CANVAS_Y_OFFSET + getHeight() + TEXT_OFFSET)
    .attr('height', TEXT_BOX_HEIGHT)
    .classed('plot-title', true)
    .text(meta.x_name);

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    //.attr('x', -2 * (getHeight() + 2 * SYNTENY_MARGIN) / 3)
    .attr('x', -(CANVAS_Y_OFFSET + getHeight()/3*2) )
    .attr('width', (getHeight() + 2 * SYNTENY_MARGIN) / 3)
    //.attr('y', SYNTENY_MARGIN - TEXT_OFFSET)
    .attr('y', CANVAS_X_OFFSET - TEXT_OFFSET)
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
    return zipWith((a, b) => (a + b) / 2, points.slice(0, -1), points.slice(1));
  };

  const makeGapFilter = () => {
    let last = 0;
    return t => {
      if(t > 0 && t - last < 10000) {
        return false;
      }
      last = t;
      return true;
    };
  };

  const makeLabelPair = full => ({
    full,
    short: full //shortenString(full, MAX_SHORT_LABEL_LENGTH)
  });

  var xOffsets = dataObj.getXLineOffsets().filter(makeGapFilter());
  var xMidpoints = midpoints(xOffsets);
  const xNames = dataObj.getXLineNames().map(makeLabelPair);

  const xOffsetToName = zipObject(xMidpoints, xNames);
  const xAxisBase = () => d3.svg.axis().scale(xScale).orient('bottom');

  var xGridLines = xAxisBase()
    .tickFormat('')
    .tickSize(-getHeight());

  var xLabels = xAxisBase()
    .tickFormat(x => xOffsetToName[x].short)
    .tickSize(0);

  const transformer = transform([
    ///{translate: [SYNTENY_MARGIN, getHeight() + SYNTENY_MARGIN]}
    {translate: [CANVAS_X_OFFSET, getHeight() + CANVAS_Y_OFFSET]}

  ]);
  var xAxisWrapper = svg.append('g').attr('transform', transformer);
  var xAxisGapsGroup = xAxisWrapper.append('g');
  var xAxisLineGroup = xAxisWrapper.append('g');

  var yOffsets = dataObj.getYLineOffsets().filter(makeGapFilter());
  var yMidpoints = midpoints(yOffsets);
  const yNames = dataObj.getYLineNames().map(makeLabelPair);

  const yOffsetToName = zipObject(yMidpoints, yNames);
  const yAxisBase = () => d3.svg.axis().scale(yScale).orient('left');

  var yGridLines = yAxisBase()
    .tickFormat('')
    .tickSize(-getWidth());

  var yLabels = yAxisBase()
    .tickFormat(y => {
      const { hover, full, short } = yOffsetToName[y];
      return hover ? full : short;
    })
    .tickSize(0);

  var yAxisWrapper = svg.append('g')
    .attr('transform',
      transform([{translate: [CANVAS_X_OFFSET, CANVAS_Y_OFFSET]}]));
  var yAxisGapsGroup = yAxisWrapper.append('g');
  var yAxisLineGroup = yAxisWrapper.append('g');

  makeLabels();

  svg = svg
    .append('g')
    .attr('transform',
      transform([{translate: [CANVAS_X_OFFSET, CANVAS_Y_OFFSET]}]))
    .append('g').attr('id', 'zoom-group')
    .call(zoom).on('mousedown.zoom', null); //disable panning

  var brushGroup = svg
    .append('g').attr('clip-path', 'url(#plot-clip-box)')
    .append('g').attr('id', 'brush-group')
    .call(brush);

  var colorScale = initialColorScale;

  // function drawBG() {
  //   const allDots = dataObj.currentData().raw;
  //   const width = getWidth();
  //   const height = getHeight();
  //   background.clearRect(0, 0, width, height);
  //   background.fillStyle = UNSELECTED_DOT_FILL;
  //   allDots.forEach(function(d) {
  //     const cx = xScale(d.x_relative_offset);
  //     const cy = yScale(d.y_relative_offset);

  //     if (cx < 0 || cx > width || cy < 0 || cy > height)
  //       return;

  //     background.fillRect(cx - CIRCLE_RADIUS,
  //       cy - CIRCLE_RADIUS,
  //       CIRCLE_RADIUS,
  //       CIRCLE_RADIUS);
  //   });
  // }


  const draw = (elapsedMS, initialColorScale, finalColorScale) => {

    const start = Date.now();

    var intermediateColorScale;
    var t = Math.min(
      (DOTPLOT_COLOR_TRANS_LEN - elapsedMS) / DOTPLOT_COLOR_TRANS_LEN, 1);
    intermediateColorScale = interpolateScales(initialColorScale,
      finalColorScale,
      t);

    var allData = dataObj.currentData();
    var activeDots = allData.active;

    const width = getWidth();
    const height = getHeight();

    // context.clearRect(0, 0, width, height);

    /* On top, active dots */
    // activeDots.sort((a, b) => b[field] - a[field]);
    const rounded = x => {
      return Math.floor(x[field] * ROUNDING_FACTOR) / ROUNDING_FACTOR;
    };

    let last_rounded_val = undefined;
    // for (var i = 0; i < activeDots.length; i++) {
    //   const d = activeDots[i];
    //   const cx = xScale(d.x_relative_offset);
    //   const cy = yScale(d.y_relative_offset);

    //   if(rounded(d) !== last_rounded_val) {
    //     context.fillStyle = intermediateColorScale(rounded(d));
    //     last_rounded_val = rounded(d);
    //   }

    //   if (cx < 0 || cx > width || cy < 0 || cy > height)
    //     continue;

    //   context.fillRect(cx - CIRCLE_RADIUS,
    //     cy - CIRCLE_RADIUS,
    //     CIRCLE_RADIUS,
    //     CIRCLE_RADIUS);
    // }

    // if (highlighted) {
    //   context.beginPath();
    //   context.strokeStyle = 'red';
    //   context.arc(xScale(highlighted.x_relative_offset),
    //     yScale(highlighted.y_relative_offset), 10, 0, 2 * Math.PI);
    //   context.stroke();
    // }

    const diff = Date.now() - start;
    if (elapsedMS > 0) {
      setTimeout(draw, 0, elapsedMS - diff, initialColorScale, finalColorScale);
    }
  };


  function interpolateScales(a, b, t) {
    const aDomain = a.domain();
    const bDomain = b.domain();
    const min = Math.min(aDomain[0], bDomain[0]);
    const max = Math.max(aDomain[aDomain.length - 1],
      bDomain[bDomain.length - 1]);
    const domain = utils.samplePointsInRange([min, max],
                                    NUM_COLOR_SCALE_INTERPOLATION_SAMPLES);
    const range = domain.map(function(input) {
      return d3.interpolateRgb(a(input), b(input))(t);
    });
    return d3.scale.linear().domain(domain).range(range);
  }

  function setSyntenyData() {
    var desc = dataObj.getFilterDescription();
    if (desc.x) {
      brushX.set(vec.make(desc.x));
    } else {
      brushX.set(vec.make(xScale.domain()));
    }

    if (desc.y) {
      brushY.set(vec.make(desc.y));
    } else {
      brushY.set(vec.make(yScale.domain()));
    }

    if (desc.logks) {
      brushV.set(vec.make(desc.logks));
    } else {
      brushV.set(vec.make(vExtent));
    }

    var raw = rawSeenByLux;
    for (i=0; i<raw.length; ++i) {
      enabledArray[i] = 1.0;
      if ( desc.drPlotChromosomes
        && !(desc.drPlotChromosomes.has(raw[i].x_chromosome_id) 
              && desc.drPlotChromosomes.has(raw[i].y_chromosome_id)) ){
        enabledArray[i] = 0.0;
      }

      if(desc.heatmapChromosomes &&
        !desc.heatmapChromosomes
        .has(raw[i].x_chromosome_id+'_'+raw[i].y_chromosome_id)){
        enabledArray[i] = 0.0;
      }
    } 
    
    eAttributeBuffer.set(enabledArray);
    Lux.Scene.invalidate();
    draw(0, colorScale, colorScale);
  }

  dataObj.addListener(setSyntenyData);
  // drawBG();
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




/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
