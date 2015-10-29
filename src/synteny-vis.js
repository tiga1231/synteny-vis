'use strict';

const histogram = require('./histogram');
const dotplot = require('./dotplot');
const _ = require('lodash');
const d3 = require('d3');
const css = require('generate-css');

const DO_BENCHMARK = false;
const SHOW_MAXIMA_AND_MINIMA = true;

function buildDiv(element_id) {
	const div = d3.select(element_id);

	div.append('style').text(css.getStyleSheetForDiv(element_id));

	div.append('canvas').attr('id', 'dotplot-canvas-bak');
	div.append('canvas').attr('id', 'dotplot-canvas');
	div.append('svg').attr('id', 'dotplot');

	const histogramWrapper = div.append('div').attr('id', 'histogram-wrapper');
	histogramWrapper.append('svg').attr('id', 'plot').classed('histogram', true);
	histogramWrapper.append('svg').attr('id', 'plot2').classed('histogram', true);
	histogramWrapper.append('svg').attr('id', 'plot3').classed('histogram', true);

	const formWrapper = div.append('div').attr('id', 'form-wrapper');

	function makeForm(title, optionId, elements, checkIndex) {
		const navOptions = formWrapper.append('div').classed('radio-button-box', true);
		navOptions.append('strong').text(title + ': ');

		const navForm = navOptions.append('form').attr('id', optionId);
		const options = navForm.selectAll('input')
			.data(elements).enter().append('input')
			.attr('type', 'radio').attr('name', optionId)
			.attr('value', d => d[0]);

		options.forEach(selection => {
			selection.forEach((element, i) => {
				const label = document.createElement('label');
				label.textContent = elements[i][1];
				navForm.node().insertBefore(label, element);
			});
		});

		options[0][checkIndex].checked = true;
	}

	const option = (value, text) => [value, text];

	makeForm('Navigation Mode', 'mouse-options', [
		option('brush', 'Brushing'),
		option('pan', 'Panning')
	], 0);

	makeForm('Plotting order', 'summary-options', [
		option('minimum', 'High to Low'),
		option('maximum', 'Low to High')
	], 0);

	makeForm('Dot Plot Coloring', 'plot-var-options', [
		option('logks', 'log ks'),
		option('logkn', 'log kn'),
		option('logkskn', 'log ks/kn')
	], 0);

	makeForm('Color Scale', 'color-options', [
		option('rg', 'red-green'),
		option('rg_quantized', 'rg_quantized'),
		option('rainbow', 'rainbow'),
		option('rainbow_quantized', 'rainbow_quantized'),
		option('auto', 'auto')
	], 0);

	const persistenceOptions = formWrapper.append('div').classed('radio-button-box', true);
	persistenceOptions.append('strong').text('Auto-scale persistence');

	persistenceOptions.append('input').attr('id', 'persistence').attr('type', 'range').attr('min', 0).attr('max', 100)
		.attr('value', 40).attr('step', 1);

	persistenceOptions.append('button').attr('id', 'persistence-button').attr('type', 'button').text('Refresh auto scale');

	persistenceOptions.append('p').text('Largest persistence edge that will be removed: ').append('label').attr('id', 'persistence-text').text('40');
}

function controller(dataObj, element_id) {

	buildDiv('#' + element_id);
	
	const refreshAutoScale = (persistence) => {
		const radio = document.getElementById('color-options');
		const auto = _.find(radio.children, child => child.value === 'auto');
		auto.checked = true;

		const h = histograms[activeField];
		h.setColorScale(h.getAutoScale(persistence));

		if (SHOW_MAXIMA_AND_MINIMA)
			_.each(histograms, h => h.updateMinMaxMarkers(persistence));
	};

	const getPersistence = () => d3.select('#persistence').node().value;

	d3.select('#persistence')
		.on('input', () => {
			const p = getPersistence();
			refreshAutoScale(p);
			d3.select('#persistence-text').node().innerText = p;
		});

	d3.select('#persistence-button')
		.on('click', () => {
			refreshAutoScale(getPersistence());
		});

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
			histograms[activeField].setColorScale(colorScale(activeField, 'unselected'));
			activeField = this.value;
			syntenyPlot.setField(activeField);
			var newCS;
			if (activeCS === 'auto') {
				newCS = histograms[activeField].getAutoScale(getPersistence());
			} else {
				newCS = colorScale(activeField, activeCS);
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
				newCS = histograms[activeField].getAutoScale(getPersistence());
			} else {
				newCS = colorScale(activeField, this.value);
			}
			histograms[activeField].setColorScale(newCS);
			syntenyPlot.setColorScale(newCS);
			activeCS = this.value;
		});

	const colorScale = require('colorscales').onData(dataObj.currentData().raw);

	const initial = colorScale(activeField, 'rg');
	const unselected = colorScale(activeField, 'unselected');

	syntenyPlot = dotplot.synteny('#dotplot', dataObj, 'logks', initial);
	var histograms = {
		'logks': histogram.histogram('#plot', dataObj, 'logks', initial),
		'logkn': histogram.histogram('#plot2', dataObj, 'logkn', unselected),
		'logkskn': histogram.histogram('#plot3', dataObj, 'logkskn', unselected)
	};

	// Since the histograms aren't controlling their own color scale policy 
	// now (a good thing), we need to manually fire of their update methods. 
	// Eventually, we should fix this up.
	dataObj.addListener((typeHint) => {
		if(typeHint.indexOf('stop') > -1)
			_.each(histograms, h => h.updateMinMaxMarkers(getPersistence()));
	});
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

exports.controller = controller;
