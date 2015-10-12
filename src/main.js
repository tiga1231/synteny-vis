'use strict';

var DATA_OP_TIMING = false;

var X_AXIS_ORGANISM_NAME;
var Y_AXIS_ORGANISM_NAME;

var queue = require('queue-async');
var _ = require('lodash');
var d3 = require('d3');
var sv = require('./synteny-vis');

exports.makeSyntenyDotPlot = ({data_url, element_id, genome_x, genome_y}) => {
	queue()
		.defer(d3.text, data_url)
		.await((err, ks) => {
			if (err) {
				console.log(err);
				return;
			}

			X_AXIS_ORGANISM_NAME = genome_x.organism.name;
			Y_AXIS_ORGANISM_NAME = genome_y.organism.name;

			var ksData = ksTextToObjects(ks);
			var xCumLenMap = lengthsToCumulativeBPCounts(genome_x.chromosomes);
			var yCumLenMap = lengthsToCumulativeBPCounts(genome_y.chromosomes);
			var inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);

			var ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
			console.log('Total synteny dots:', ksDataObject.currentData().raw.length);
			sv.controller(ksDataObject, element_id);
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
		roundedlogks: Math.floor(Math.log(Number(fields[0])) / Math.log(10) * 10) / 10,
		kn: Number(fields[1]),
		logkn: Math.log(Number(fields[1])) / Math.log(10),
		logkskn: (Math.log(Number(fields[0])) - Math.log(Number(fields[1]))) / Math.log(10),
		x_chromosome_id: fields[3],
		y_chromosome_id: fields[15],
		x_relative_offset: Math.round((Number(fields[4]) + Number(fields[5])) / 2),
		y_relative_offset: Math.round((Number(fields[16]) + Number(fields[17])) / 2)
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
		ksObj.x_relative_offset += xShift;
		ksObj.y_relative_offset += yShift;
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
		if (s && !(l || k || m)) return s;
		if (l && !(s || k || m)) return l;
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
