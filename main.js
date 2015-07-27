var loadksData = function(ks_filename, x_lengths_file_name, y_lengths_file_name, cb) {

  queue()
    .defer(d3.text, ks_filename)
    .defer(d3.json, x_lengths_file_name)
    .defer(d3.json, y_lengths_file_name)
    .await(function(err, ks, x_len, y_len) {
      if (err) {
        console.log(err);
        return;
      }

      var ksData = ksTextToObjects(ks);
      var xCumLenMap = lengthsToCumulativeBPCounts(x_len);
      var yCumLenMap = lengthsToCumulativeBPCounts(y_len);
      var inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);

      ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
      cb(ksDataObject, {
        xCumBPCount: xCumLenMap,
        yCumBPCount: yCumLenMap
      });
    });
};

function ksTextToObjects(text) {
  /* .ks files are delimited with a combination of tabs and double bars. */
  var csv = text.replace(/\|\|/g, ',').replace(/\t/g, ',').replace(' ', '');
  var ksLines = _.compact(csv.split('\n'));
  return _.chain(ksLines)
    .reject(function(line) {
      return line[0] === '#'
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
  return _.chain(len_list)
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
}

// Compute absolute BP offset from chromosome and relative offset
function inlineKSData(ks, xmap, ymap) {
  _.each(ks, function(ksObj) {
    var xShift = xmap[ksObj.x_chromosome_id];
    var yShift = ymap[ksObj.y_chromosome_id];
    ksObj.nt.x_relative_offset += xShift;
    ksObj.nt.y_relative_offset += yShift;
  });
  return ks;
}

function createDataObj(ks, xmap, ymap) {
  var NUM_HISTOGRAM_TICKS = 80;

  ret = {};
  var currentData = ks;
  data = _.sortBy(currentData, function(d) {
    return d.logks;
  });

  _.each(ks, function(d) {
    d.xmin = d.xmax = d.nt.x_relative_offset;
    d.ymin = d.ymax = d.nt.y_relative_offset;
  });

  var ks_bvh = bvh_build(ks);
  var plotScale = d3.scale.linear()
    .domain(d3.extent(_.pluck(currentData, 'logks')))
  computeBins(ks_bvh, 'logks', plotScale.ticks(NUM_HISTOGRAM_TICKS));

  var kn_bvh = bvh_build(ks);
  var plotScale = d3.scale.linear()
    .domain(d3.extent(_.pluck(currentData, 'logkn')))
  computeBins(kn_bvh, 'logkn', plotScale.ticks(NUM_HISTOGRAM_TICKS));

  var bvh = ks_bvh;

  var spatialFilter = null;
  var dataFilter = null;

  ret.getXLineOffsets = function() {
    return _.chain(xmap).values().sortBy().value();
  };

  ret.getYLineOffsets = function() {
    return _.chain(ymap).values().sortBy().value();
  };

  var order = 'minimum';
  ret.setOrder = function(newOrder) {
    order = newOrder;
    currentData = _.sortBy(currentData, ret.getSummaryField());
    if(order === 'minimum'){
      currentData.reverse();
    }
    ret.notifyListeners('order-change');
  };

  var sumField = 'logks';;
  ret.setSummaryField = function(field) {
    sumField = field;
    if (field === 'logks') {
      bvh = ks_bvh;
    } else if (field === 'logkn') {
      bvh = kn_bvh;
    } else {
      console.log('did not recognize that field name');
    }
    ret.removeDataFilter();
      ret.notifyListeners('variable-change');
  }

  ret.getSummaryField = function() {
    return sumField;
  }

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

  ret.currentData = function() {
    return currentData;
  };

  ret.currentDataSummary = function() {
    var wholePlot = {
      xmin: 0,
      ymin: 0,
      xmax: 1e15,
      ymax: 1e15
    };
    var summary;
    if (spatialFilter) {
      summary = bvh_find_summary(bvh, spatialFilter);
    } else {
      summary = bvh_find_summary(bvh, wholePlot);
    }
    if (dataFilter) {
      _.each(summary, function(x) {
        x.active = x.x + x.dx >= dataFilter[0] && x.x < dataFilter[1];
      });
    } else {
      _.each(summary, function(x) {
        x.active = true;
      });
    }
    return summary;
  }

  ret.addSpatialFilter = function(extents, typeHint) {
    extents.xmin = extents[0][0];
    extents.xmax = extents[1][0];
    extents.ymin = extents[0][1];
    extents.ymax = extents[1][1];
    spatialFilter = extents;
    updateData(typeHint ? typeHint : 'spatial');
  };

  ret.removeSpatialFilter = function(typeHint) {
    spatialFilter = null;
    updateData(typeHint ? typeHint : 'spatial');
  };

  ret.addDataFilter = function(extent) {
    dataFilter = extent;
    updateData('data');
  };

  ret.removeDataFilter = function() {
    dataFilter = null;
    updateData('data');
  }

  var listeners = [];
  ret.addListener = function(x) {
    listeners.push(x);
  }

  var navMode = 'brush';
  ret.getNavMode = function() {
    return navMode;
  }

  ret.setNavMode = function(mode) {
    navMode = mode;
    ret.notifyListeners('nav-mode-update');
  }

  function updateData(typeOfChange) {
    var failing = [];
    var passing = currentData;
    if (spatialFilter) {
      passing = bvh_find(bvh, spatialFilter);
      failing = bvh_find_complement(bvh, spatialFilter);
    }
    if (dataFilter) {
      var dataSplit = _.partition(passing, function(x) {
        // XXX
        return x.logks < dataFilter[1] && x.logks > dataFilter[0];
      });
      passing = dataSplit[0];
      failing = _.flatten([failing, dataSplit[1]], true);
    }
    if (!spatialFilter && !dataFilter) {
      passing = currentData;
    }
    _.each(passing, function(x) {
      x.active = true;
    });
    _.each(failing, function(x) {
      x.active = false;
    });
    ret.notifyListeners(typeOfChange);
  };

  ret.notifyListeners = function(typeOfChange) {
    _.each(listeners, function(x) {
      x(typeOfChange);
    });
  };

  updateData();
  ret.setOrder(order);
  return ret;
}

