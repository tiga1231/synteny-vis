'use strict';

const DATA_OP_TIMING = true;

const queue = require('queue-async');
const _ = require('lodash');
const d3 = require('d3');
const sv = require('./synteny-vis');

exports.makeSyntenyDotPlot = ({data_url, element_id, genome_x, genome_y}) => {
	queue()
		.defer(d3.text, data_url)
		.await((err, ks) => {
			if (err) {
				console.log(err);
				return;
			}

			const x_name = genome_x.name;
			const y_name = genome_y.name;

			const ksData = ksTextToObjects(ks);
			const xCumLenMap = lengthsToCumulativeBPCounts(genome_x.chromosomes);
			const yCumLenMap = lengthsToCumulativeBPCounts(genome_y.chromosomes);
			const inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);

			const ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
			console.log('Total synteny dots:', ksDataObject.currentData().raw.length);
			sv.controller(ksDataObject, element_id, {x_names, y_names});
		});
};

function ksTextToObjects(text) {
	/* .ks files are delimited with a combination of tabs and double bars. */
	const csvLines = text
		.replace(/\|\|/g, ',')
		.replace(/\t/g, ',')
		.replace(' ', '')
		.split('\n');

	return _.chain(csvLines)
		.filter(line => line && line[0] !== '#')
		.map(ksLineToSyntenyDot)
		.filter(line => isFinite(line.logks) && isFinite(line.logkn))
		.value();
}

function ksLineToSyntenyDot(line) {
	const fields = line.split(',');

	const ks = Number(fields[0]);
	const kn = Number(fields[1]);
	const log10 = n => Math.log(n) / Math.log(10);

	return {
		ks,
		logks: log10(ks),
		roundedlogks: Math.floor(log10(ks) * 10) / 10,
		kn,
		logkn: log10(kn),
		logkskn: log10(ks) - log10(kn),
		x_chromosome_id: fields[3],
		y_chromosome_id: fields[15],
		x_relative_offset: Math.round((Number(fields[4]) + Number(fields[5])) / 2),
		y_relative_offset: Math.round((Number(fields[16]) + Number(fields[17])) / 2)
	};
}

function lengthsToCumulativeBPCounts(len_list) {
	const ntLenList = _.chain(len_list)
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

	const geLenList = _.chain(len_list)
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

	const nameLenList = _.chain(len_list)
		.sortBy('name')
		.reduce(function(map, kv) {
			map[kv.name] = map.total;
			map.total += kv.gene_count;
			return map;
		}, {
			total: 0
		})
		.value();

	const geneCounts = _.object(
		_.map(len_list, x => x.name), 
		_.map(len_list, x => x.gene_count)
	);

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
		ksObj.x_relative_offset += xShift;
		ksObj.y_relative_offset += yShift;
	});
	return ks;
}

function between(low, high, field) {
	if (field) {
		return x => low <= x[field] && x[field] < high;
	} else {
		return x => low <= x && x < high;
	}
}

function createDataObj(syntenyDots, xmapPair, ymapPair) {
	var xmap = xmapPair.ge;
	var ymap = ymapPair.ge;
	var ret = {};

	var dataFilters = {};

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
			.sortBy('1')
			.pluck('0')
			.reject(x => x === 'total')
			.value();
	}

	function getFilterFunction(filter) {
		const filterFuncs = _.values(filter);
		return x => _.all(_.map(filterFuncs, f => f(x)));
	}

	ret.currentData = function currentData() {
		return {
			raw: syntenyDots,
			active: _.filter(syntenyDots, getFilterFunction(dataFilters))
		};
	};

	const sortedDots = _.memoize(_.partial(_.sortBy, syntenyDots));
	ret.currentDataSummary = function currentDataSummary(ticks, field) {
		const filtersWithoutField = getFilterFunction(_.omit(dataFilters, field));
		const validPoints = _.filter(sortedDots(field), filtersWithoutField);
		const dx = ticks[1] - ticks[0];

		return _.map(ticks, x => {
				var hi = _.sortedIndex(validPoints, {[field]: x + dx}, field);
				var lo = _.sortedIndex(validPoints, {[field]: x}, field);
				return { x, dx, y: hi - lo };
			});
	};

	ret.addSpatialFilter = function(extents, typeHint) {
		dataFilters.spatial = function(dot) {
			return dot.x_relative_offset >= extents[0][0] &&
				dot.x_relative_offset <= extents[1][0] &&
				dot.y_relative_offset >= extents[0][1] &&
				dot.y_relative_offset <= extents[1][1];
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

	ret.removeDataFilter = function(field) {
		delete dataFilters[field]
		;
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
		const logIt = (f, name) => {
			return (...args) => {
				var start = Date.now();
				var x = f.call(null, ...args);
				console.log(name, Date.now() - start);
				return x;
			};
		};

		ret.currentData = logIt(ret.currentData, 'currentData');
		ret.currentDataSummary = logIt(ret.currentDataSummary, 'currentDataSummary');
		ret.notifyListeners = logIt(ret.notifyListeners, 'notifyListeners');
	}

	ret.setOrder('logks', true);
	ret.setGEvNTMode(gentMode);
	return ret;
}

// We need to expose this to the outside world.
window.makeSyntenyDotPlot = exports.makeSyntenyDotPlot;
