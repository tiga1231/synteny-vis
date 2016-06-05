'use strict';

const utils = require('./utils');
const _ = require('lodash');
const d3 = require('d3');
const transform = require('svg-transform');

const { 
	SYNTENY_MARGIN ,
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
	var computedWidth = utils.getComputedAttr(svgElement, 'width');
	var computedHeight = utils.getComputedAttr(svgElement, 'height');
	var windowAspectRatio = computedHeight / computedWidth;

	var width;
	var height;

	if (MAXIMIZE_WIDTH || windowAspectRatio / dataAspectRatio > 1) {
		width = computedWidth;
		height = dataAspectRatio * width;
	} else {
		height = computedHeight;
		width = 1 / dataAspectRatio * height;
	}

	d3.select(id).style('width', width + 2*SYNTENY_MARGIN);
	d3.select(id).style('height', height + 2*SYNTENY_MARGIN);

	/* This fixes the alignment of the svg element and the canvas elements. 
	 * Not really sure what is going on here -- we are close to a consistent
	 * transformation/offset scheme, but needs a bit more work. */
	width -= 2*SYNTENY_MARGIN;
	height -= 2*SYNTENY_MARGIN;

	var xScale = d3.scale.linear().domain(xExtent).range([0, width]);
	var yScale = d3.scale.linear().domain(yExtent).range([height, 0]);

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
			if(out.length === 0 || Math.abs(scale(next) - scale(_.last(out))) > MIN_TEXT_GAP)	
				out.push(next);
			return out;
		}, []);
	};

	const genGeVOLink = (aDbId, bDbId) =>
		'http://geco.iplantcollaborative.org/asherkhb/coge/GEvo.pl?' +
			`fid1=${aDbId};fid2=${bDbId};apply_all=${50000};num_seqs=${2}`;

	const updateGeVOLink = function(x, y) {
		const distance = d =>
			Math.pow(d.x_relative_offset - x, 2) + Math.pow(d.y_relative_offset - y, 2);
		const point = _.min(dataObj.currentData().raw, distance);

		const ratio = Math.pow((xScale.range()[1] - xScale.range()[0]) /
			(xScale.domain()[1] - xScale.domain()[0]), 2);
		if(distance(point) * ratio < GEVO_CLICK_PROXIMITY_THRESHOLD_PIXELS) {
			d3.select('#gevo-link')
				.attr('href', genGeVOLink(point.x_feature_id, point.y_feature_id));
		}
	};

	const makeLabels = function() {

		const xFilter = x => (0 <= xScale(x) && xScale(x) <= width);
		const yFilter = y => (0 <= yScale(y) && yScale(y) <= height);

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
		.scaleExtent([1, 100]).on('zoom', function() {
			var t = d3.event.translate;
			var s = d3.event.scale;
			t[0] = Math.min(0, Math.max(-width * s + width, t[0]));
			t[1] = Math.min(0, Math.max(-height * s + height, t[1]));
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
				const mouse = d3.mouse(this);
				updateGeVOLink(xScale.invert(mouse[0]), yScale.invert(mouse[1]));
			} else {
				dataObj.addSpatialFilter(brush.extent(), 'spatial-stop');
				resizeBrushBoundary();
			}
		});

	const canvas = d3.select(id + '-canvas')
		.attr('width', width)
		.attr('height', height)
		.style('left', SYNTENY_MARGIN)
		.style('top', SYNTENY_MARGIN);

	const backCanvas = d3.select(id + '-canvas-background')
		.attr('width', width)
		.attr('height', height)
		.style('left', SYNTENY_MARGIN)
		.style('top', SYNTENY_MARGIN);

	const context = canvas.node().getContext('2d');
	const background = backCanvas.node().getContext('2d');

	var svg = d3.select(id);


	var TEXT_OFFSET = 35;
	var TEXT_BOX_HEIGHT = 25;
	svg.append('text')
		.attr('x', (width + 2 * SYNTENY_MARGIN) / 3)
		.attr('width', (width + 2 * SYNTENY_MARGIN) / 3)
		.attr('y', SYNTENY_MARGIN + height + TEXT_OFFSET)
		.attr('height', TEXT_BOX_HEIGHT)
		.classed('plot-title', true)
		.text(meta.x_name);

	svg.append('text')
		.attr('transform', 'rotate(-90)')
		.attr('x', -2 * (height + 2 * SYNTENY_MARGIN) / 3)
		.attr('width', (height + 2 * SYNTENY_MARGIN) / 3)
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
		.attr('width', width)
		.attr('y', 0)
		.attr('height', height)
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
		.tickSize(-height);

	var xLabels = xAxisBase()
		.tickFormat(x => xOffsetToName[x])
		.tickSize(0);

	var xAxisWrapper = svg.append('g').attr('transform', transform([{translate: [SYNTENY_MARGIN, height + SYNTENY_MARGIN]}]));
	var xAxisGapsGroup = xAxisWrapper.append('g');
	var xAxisLineGroup = xAxisWrapper.append('g');

	var yOffsets = dataObj.getYLineOffsets();
	var yMidpoints = midpoints(yOffsets);

	const yOffsetToName = _.fromPairs(_.zip(yMidpoints, dataObj.getYLineNames()));
	const yAxisBase = () => d3.svg.axis().scale(yScale).orient('left');

	var yGridLines = yAxisBase()
		.tickFormat('')
		.tickSize(-width);

	var yLabels = yAxisBase()
		.tickFormat(x => yOffsetToName[x])
		.tickSize(0);

	var yAxisWrapper = svg.append('g').attr('transform', transform([{translate: [SYNTENY_MARGIN, SYNTENY_MARGIN]}]));
	var yAxisGapsGroup = yAxisWrapper.append('g');
	var yAxisLineGroup = yAxisWrapper.append('g');

	makeLabels();

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

	function drawBG() {
		var allDots = dataObj.currentData().raw;
		background.clearRect(0, 0, width, height);
		background.fillStyle = UNSELECTED_DOT_FILL;
		_.each(allDots, function(d) {
			const cx = xScale(d.x_relative_offset);
			const cy = yScale(d.y_relative_offset);

			if (cx < 0 || cx > width || cy < 0 || cy > height)
				return;

			background.fillRect(cx - CIRCLE_RADIUS, cy - CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS);
		});
	}

	function draw(elapsedMS, initialColorScale, finalColorScale) {
		var start = Date.now();

		var intermediateColorScale;
		var t = Math.min((DOTPLOT_COLOR_TRANS_LEN - elapsedMS) / DOTPLOT_COLOR_TRANS_LEN, 1);
		intermediateColorScale = interpolateScales(initialColorScale, finalColorScale, t);

		var allData = dataObj.currentData();
		var activeDots = allData.active;

		//console.log('Time after collecting data', Date.now() - start);
		start = Date.now();

		context.clearRect(0, 0, width, height);

		/* On top, active dots */
		var groups = [];
		var index = 0;

		const roundlogks = x => Math.floor(x.logks * ROUNDING_FACTOR) / ROUNDING_FACTOR; 
		while (index < activeDots.length) {
			var low = index;
			var val = roundlogks(activeDots[index]);
			index = _.sortedLastIndexBy(activeDots, {
				logks: val
			}, x => -roundlogks(x));
			groups.push([low, index]);
		}

		_.each(groups, function([loIndex, hiIndex]) {
			context.fillStyle = intermediateColorScale(roundlogks(activeDots[loIndex]));
			for (var i = loIndex; i < hiIndex; i++) {
				const d = activeDots[i];
				const cx = xScale(d.x_relative_offset);
				const cy = yScale(d.y_relative_offset);

				if (cx < 0 || cx > width || cy < 0 || cy > height)
					continue;
				context.fillRect(cx - CIRCLE_RADIUS, cy - CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS);
			}
		});

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
		const max = Math.max(aDomain[aDomain.length - 1], bDomain[bDomain.length - 1]);
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
