'use strict';

var HISTOGRAM_MARGIN = 50; /* Padding around histogram */
var HISTOGRAM_Y_SCALE_TRANS_LEN = 750; /* How long a y-axis histogram rescale takes */
var HISTOGRAM_COLOR_TRANS_LEN = 500; /* How long a color scale transition takes */
var NUM_HISTOGRAM_TICKS = 100;
var UNSELECTED_BAR_FILL = '#D0D0D0';

const SHOW_MAXIMA_AND_MINIMA = true;

var persist = require('./persistence');
var util = require('./utils');
var env = require('./window');
var _ = require('lodash');
var d3 = require('d3');

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
		dataObj.notifyListeners('autoscale');
	}

	var colorScale = initialColorScale;
	var xPlotScale = d3.scale.linear().domain(dataExtent).range([HISTOGRAM_MARGIN, plotWidth - HISTOGRAM_MARGIN]);

	function makeBins() {
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
		if (!autoScale) generateAutoScale(dataObj.currentDataSummary(bins, field), env.getPersistence());
		return autoScale;
	}

	function generateAutoScale(summary, persistence) {
		const start = Date.now();

		const gapBetweenPoints = (A, i) => Math.abs(A[i].y - A[i + 1].y);

		const isMaxima = (A, i) => A[i].y > Math.max(A[i-1].y, A[i+1].y);
		//const isMinima = (A, i) => A[i].y < Math.min(A[i-1].y, A[i+1].y);

		function indexOfSmallestPointDifference(A) {
			return _(A.length - 1).range().min(i => gapBetweenPoints(A, i));
		}

		function simplify(dirtyPoints) {
			const points = persist.removeNonExtrema(dirtyPoints);
			const index = indexOfSmallestPointDifference(points);

			if(points.length < 3 || gapBetweenPoints(points, index) > persistence)
				return points;

			points.splice(index === 0 ? 1 : index, 1);

			return simplify(points);
		}

		const minimaAndMaximas = simplify(summary);

		const annotated = _.map(minimaAndMaximas, function(x, i, a) {
			x.isMax = i > 0 && i < a.length - 1 && isMaxima(minimaAndMaximas, i);
			return x;
		});

		if (SHOW_MAXIMA_AND_MINIMA) {
			const tempSelA = plot.selectAll('.maxMark').data(annotated);
			tempSelA.exit().remove();
			tempSelA.enter().append('circle').classed('maxMark', 1);
			tempSelA
				.attr('cx', d => xPlotScale(d.x + d.dx / 2))
				.attr('cy', d => yPlotScale(d.y) - 5)
				.attr('r', 3)
				.attr('fill', d => d.isMax ? 'red' : 'orange');
		}

		_(annotated).filter(x => x.isMax).each((x, i) => x.colorIndex = i).commit();

		const sorted = _.sortBy(annotated, 'x');
		const colors = d3.scale.category10();
		const domain = _.map(sorted, d => d.x + d.dx / 2);
		const range = _.map(sorted, function(d) {
			return d.isMax ? colors(d.colorIndex) : UNSELECTED_BAR_FILL;
		});

		autoScale = d3.scale.linear().domain(domain).range(range);

		console.log(Date.now() - start);
	}

	var plotBrush = d3.svg.brush()
		.x(xPlotScale)
		.on('brush', plotBrushBrush)
		.on('brushend', plotBrushEnd);

	var dataBarSel = plot.selectAll('.dataBars')
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
		if (typeHint === 'initial') {
			dataBarSel
				.data(dataObj.currentDataSummary(bins, field))
				.attr('x', function(d) {
					return xPlotScale(d.x);
				})
				.attr('width', function(d) {
					return (xPlotScale(d.x + d.dx) - xPlotScale(d.x));
				});
		}
		var data = dataObj.currentDataSummary(bins, field);
		if (typeHint.indexOf('stop') > -1 || typeHint == 'autoscale')
			setTimeout(generateAutoScale, 0 , data, env.getPersistence());

		if (typeHint.indexOf('stop') > - 1) {
			lastYExtent = [0, 3 / 2 * d3.max(_.pluck(data, 'y'))];
			yPlotScale.domain(lastYExtent);
			yAxisSel.transition()
				.duration(HISTOGRAM_Y_SCALE_TRANS_LEN)
				.call(yAxis);
			dataBarSel
				.data(data)
				.transition()
				.duration(HISTOGRAM_Y_SCALE_TRANS_LEN)
				.call(updatePlotAttrs);

		} else {
			dataBarSel
				.data(data)
				.call(updatePlotAttrs);
		}
	}

	updatePlot('initial');
	dataObj.addListener(updatePlot);

	function setColorScale(newColorScale) {
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

