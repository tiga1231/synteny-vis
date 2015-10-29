'use strict';

var utils = require('utils');
var transform = require('svg-transform');
var _ = require('lodash');
var d3 = require('d3');
var transform = require('svg-transform');

var SYNTENY_MARGIN = 50; /* Padding around synteny plot for axes */
var CIRCLE_RADIUS = 2;
var UNSELECTED_DOT_FILL = '#D0D0D0';
var NUM_COLOR_SCALE_INTERPOLATION_SAMPLES = 100;
var DOTPLOT_COLOR_TRANS_LEN = 500; /* How long a color scale transition takes */

function synteny(id, dataObj, field, initialColorScale) {

	var xExtent = [0, _.max(dataObj.getXLineOffsets())];
	var yExtent = [0, _.max(dataObj.getYLineOffsets())];
	var dataAspectRatio = yExtent[1] / xExtent[1];

	const baseID = id.substring(1);
	const svgElement = document.getElementById(baseID);
	var computedWidth = utils.getComputedAttr(svgElement, 'width') - 2 * SYNTENY_MARGIN;
	var computedHeight = utils.getComputedAttr(svgElement, 'height') - 2 * SYNTENY_MARGIN;
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

		brushGroup.attr('transform', transform([{translate: t}, {scale: s}]));

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

	var xAxisWrapper = svg.append('g').attr('transform', transform([{translate: [SYNTENY_MARGIN, height + SYNTENY_MARGIN]}]));
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

	var yAxisWrapper = svg.append('g').attr('transform', transform([{translate: [SYNTENY_MARGIN, SYNTENY_MARGIN]}]));
	var yAxisGapsGroup = yAxisWrapper.append('g').classed('yAxis', true).call(yGapsAxis);
	var yAxisLineGroup = yAxisWrapper.append('g').classed('yAxis', true).call(yLineAxis);

	svg = svg
		.append('g')
		.attr('transform', transform([{translate: [SYNTENY_MARGIN, SYNTENY_MARGIN]}]))
		.append('g').attr('id', 'zoom-group')
		.call(zoom).on('mousedown.zoom', null); //disable panning

	var brushGroup = svg
		.append('g').attr('clip-path', 'url(#plot-clip-box)')
		.append('g').attr('id', 'brush-group')
		.call(brush);

	var colorScale = initialColorScale;

	function draw(elapsedMS, initialColorScale, finalColorScale, typeHint) {
		var start = Date.now();

		var intermediateColorScale;
		if (elapsedMS === 0 && typeHint === 'data') {
			intermediateColorScale = finalColorScale;
		} else {
			var t = Math.min((DOTPLOT_COLOR_TRANS_LEN - elapsedMS) / DOTPLOT_COLOR_TRANS_LEN, 1);
			intermediateColorScale = interpolateScales(initialColorScale, finalColorScale, t);
		}

		var allData = dataObj.currentData();
		var activeDots = allData.active;
		var allDots = allData.raw;

		//console.log('Time after collecting data', Date.now() - start);
		start = Date.now();

		if (typeHint === 'zoom') {
			contextbak.clearRect(0, 0, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);
			contextbak.fillStyle = UNSELECTED_DOT_FILL;
			_.each(allDots, function(d) {
				var cx = SYNTENY_MARGIN + xScale(d.x_relative_offset);
				var cy = SYNTENY_MARGIN + yScale(d.y_relative_offset);

				if (cx < SYNTENY_MARGIN || cx > width + SYNTENY_MARGIN || cy < SYNTENY_MARGIN || cy > height + SYNTENY_MARGIN)
					return;

				contextbak.fillRect(cx - CIRCLE_RADIUS, cy - CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS);
			});
		}

		//console.log('Time to draw bg points:', Date.now() - start);
		start = Date.now();

		context.clearRect(0, 0, width + 2 * SYNTENY_MARGIN, height + 2 * SYNTENY_MARGIN);

		/* On top, active dots */
		var minDomX = xScale.domain()[0];
		var maxDomX = xScale.domain()[1];
		var minDomY = yScale.domain()[0];
		var maxDomY = yScale.domain()[1];
		var minRanX = xScale.range()[0];
		var maxRanX = xScale.range()[1];
		var minRanY = yScale.range()[0];
		var maxRanY = yScale.range()[1];
		var widthDomX = maxDomX - minDomX;
		var widthDomY = maxDomY - minDomY;
		var widthRanX = maxRanX - minRanX;
		var widthRanY = maxRanY - minRanY;
		var xRatio = widthRanX / widthDomX;
		var xShift = minDomX * xRatio + minRanX - SYNTENY_MARGIN;
		var yRatio = widthRanY / widthDomY;
		var yShift = maxDomY * yRatio + maxRanY - SYNTENY_MARGIN;

		var groups = [];
		var index = 0;
		function makeComp(v) {
			return function(x) {
				return x.roundedlogks < v;
			};
		}
		while (index < activeDots.length) {
			var lo = index;
			var val = activeDots[index].roundedlogks;
			index = _.sortedLastIndex(activeDots, {
				roundedlogks: val
			}, makeComp(val));
			groups.push([lo, index]);
		}

		for (var g = 0; g < groups.length; g++) {
			var group = groups[g];
			var loIndex = group[0];
			var hiIndex = group[1];
			context.fillStyle = intermediateColorScale(activeDots[loIndex].roundedlogks);
			for (var i = loIndex; i < hiIndex; i++) {
				var d = activeDots[i];
				var cx = d.x_relative_offset * xRatio - xShift;
				var cy = d.y_relative_offset * yRatio - yShift;

				if (cx < SYNTENY_MARGIN || cx > width + SYNTENY_MARGIN || cy < SYNTENY_MARGIN || cy > height + SYNTENY_MARGIN)
					continue;

				context.fillRect(cx - CIRCLE_RADIUS, cy - CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS);
			}
		}
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
		if (typeHint == 'autoscale') return;
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
