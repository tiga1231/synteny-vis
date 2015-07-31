'use strict';

var DATA_OP_TIMING = true;

var X_AXIS_ORGANISM_NAME;
var Y_AXIS_ORGANISM_NAME;

var loadksData = function(ks_filename, x_id, y_id, cb) {
  queue()
    .defer(d3.text, ks_filename)
    //.defer(d3.json, 'https://genomevolution.org/coge/api/v1/genomes/' + x_id)
    //.defer(d3.json, 'https://genomevolution.org/coge/api/v1/genomes/' + y_id)
    .defer(d3.json, 'lengths/' + x_id + '.json')
    .defer(d3.json, 'lengths/' + y_id + '.json')
    .await(function(err, ks, x_len, y_len) {
      if (err) {
        console.log(err);
        return;
      }

      X_AXIS_ORGANISM_NAME = x_len.organism.name;
      Y_AXIS_ORGANISM_NAME = y_len.organism.name;

      var ksData = ksTextToObjects(ks);
      var xCumLenMap = lengthsToCumulativeBPCounts(x_len.chromosomes);
      var yCumLenMap = lengthsToCumulativeBPCounts(y_len.chromosomes);
      var inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);

      var ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
      console.log('Total synteny dots:', ksDataObject.currentData().raw.length);
      cb(ksDataObject);
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
    kn: Number(fields[1]),
    logkn: Math.log(Number(fields[1])) / Math.log(10),
    logkskn: (Math.log(Number(fields[0])) - Math.log(Number(fields[1]))) / Math.log(10),
    x_chromosome_id: fields[3],
    y_chromosome_id: fields[15],
    ge: {
      x_relative_offset: Number(fields[10]),
      y_relative_offset: Number(fields[22])
    },
    nt: {
      x_relative_offset: Math.round((Number(fields[4]) + Number(fields[5])) / 2),
      y_relative_offset: Math.round((Number(fields[16]) + Number(fields[17])) / 2)
    }
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

  return {
    nt: ntLenList,
    ge: geLenList,
    name: nameLenList
  };
}

// Compute absolute BP offset from chromosome and relative offset
function inlineKSData(ks, xmap, ymap) {
  _.each(ks, function(ksObj) {
    var xShift = xmap.nt[ksObj.x_chromosome_id];
    var yShift = ymap.nt[ksObj.y_chromosome_id];
    ksObj.nt.x_relative_offset += xShift;
    ksObj.nt.y_relative_offset += yShift;

    var xNameShift = xmap.name[ksObj.x_chromosome_id];
    var yNameShift = ymap.name[ksObj.y_chromosome_id];
    xShift = xmap.ge[ksObj.x_chromosome_id];
    yShift = ymap.ge[ksObj.y_chromosome_id];
    ksObj.ge.x_relative_offset -= xNameShift;
    ksObj.ge.y_relative_offset -= yNameShift;
    ksObj.ge.x_relative_offset += xShift;
    ksObj.ge.y_relative_offset += yShift;
  });
  return ks;
}

function between(low, high, field) {
  if (field) {
    return function(x) {
      return low <= x[field] && x[field] < high;
    }
  } else {
    return function(x) {
      return low <= x && x < high;
    }
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
    return _.chain(xmap)
      .pairs()
      .sortBy('1')
      .pluck('0')
      .reject(function(x) {
        return x === 'total';
      })
      .value();
  };

  ret.getYLineNames = function() {
    return _.chain(ymap)
      .pairs()
      .sortBy('1')
      .pluck('0')
      .reject(function(x) {
        return x === 'total';
      })
      .value();
  };

  ret.currentData = function currentData() {
    return _.reduce(dataFilters, function(ret, filterFunc) {
      var split = _.partition(ret.active, filterFunc);
      ret.active = split[0];
      ret.inactive = ret.inactive.concat(split[1]);
      return ret;
    }, {
      raw: syntenyDots,
      active: syntenyDots,
      inactive: []
    });
  };

  ret.currentDataSummary = function currentDataSummary(ticks, field) {
    var filtersToApply = _.omit(dataFilters, field);

    var validPoints = _.chain(filtersToApply)
      .reduce(function(dots, filterFunc) {
        return _.filter(dots, filterFunc);
      }, syntenyDots)
      .sortBy(field)
      .value();

    var diff = ticks[1] - ticks[0];

    return _.chain(ticks)
      .map(function(tick) {
        var start = {},
          end = {};
        start[field] = tick;
        end[field] = tick + diff;
        var low = _.sortedIndex(validPoints, start, field);
        var hi = _.sortedIndex(validPoints, end, field);
        return {
          x: tick,
          dx: diff,
          y: hi - low
        };
      }).value();
  }

  ret.addSpatialFilter = function(extents, typeHint) {
    dataFilters['spatial'] = function(dot) {
      return dot[gentMode].x_relative_offset >= extents[0][0] &&
        dot[gentMode].x_relative_offset <= extents[1][0] &&
        dot[gentMode].y_relative_offset >= extents[0][1] &&
        dot[gentMode].y_relative_offset <= extents[1][1];
    };
    ret.notifyListeners(typeHint);
  };

  ret.removeSpatialFilter = function(typeHint) {
    delete dataFilters['spatial'];
    ret.notifyListeners(typeHint);
  };

  ret.addDataFilter = function(extent, field) {
    dataFilters[field] = between(extent[0], extent[1], field);
    ret.notifyListeners('data');
  };

  ret.removeDataFilter = function(field) {
    delete dataFilters[field];
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
    }

    var s = ret.currentDataSummary;
    ret.currentDataSummary = function(a, b) {
      var start = Date.now();
      var x = s(a, b);
      console.log('currentDataSummary', Date.now() - start);
      return x;
    }
  }
  ret.setOrder('logks', true);
  ret.setGEvNTMode(gentMode);
  return ret;
}

