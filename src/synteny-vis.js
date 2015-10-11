'use strict';

var histogram = require('./histogram');
var dotplot = require('./dotplot');
var _ = require('lodash');
var d3 = require('d3');
var css = require('generate-css');

const DO_BENCHMARK = true;

var COLOR_RANGES = {
	rg: ['red', 'green'],
	rg_quantized: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
	rainbow: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
	rainbow_quantized: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']
};

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

function buildDiv(element_id) {
	const div = d3.select(element_id);
	div.append('style').text(css.getStyleSheetForDiv(element_id));
}

function controller(dataObj, element_id) {

	element_id.replace('a', '');
	buildDiv('body'); // FIXME

	_refreshAutoDots = function() {
		_.each(histograms, function(h) {
			h.refreshAutoScale('autoscale');
		});
	};

	var syntenyPlot;
	/* zoom/pan switching */
	d3.selectAll('#mouse-options input[name=mouse-options]')
		.on('change', function() {
			syntenyPlot.setNavMode(this.value);
		});

	/* summary mode switching */
	d3.selectAll('#summary-options input[name=summary-options]')
		.on('change', function() {
			dataObj.setOrder('logks', this.value === 'minimum');
		});

	/* Plot variable switching */
	d3.selectAll('#plot-var-options input[name=plot-var-options]')
		.on('change', function() {
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
	d3.selectAll('#color-options input[name=color-options]')
		.on('change', function() {
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

	/* Benchmark */
	if (DO_BENCHMARK) {
		var [minLogKs, maxLogKs] = d3.extent(dataObj.currentData().raw, x => x.logks);
		var points = _.range(minLogKs, maxLogKs, (maxLogKs - minLogKs) / 10);

		var rangeList = _.chain(points)
			.map(lo => _.map(points, hi => [lo, hi]))
			.flatten()
			.filter(([lo, hi]) => lo < hi)
			.value();

		var asyncBenchmark = require('async-benchmark');
		asyncBenchmark.benchmark(rangeList, function(range) {
			histograms.logks.brush.extent(range);
			histograms.logks.brush.event(histograms.logks.selection);
		}, function(info) {
			alert('Average brush time: ' + info.average + ', max: ' + info.max);
		});
	}
}

exports.refreshAutoDots = refreshAutoDots;
exports.refreshAutoScale = refreshAutoScale;
exports.controller = controller;
