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
      var ksData = ksTextToObjects(ks);
      var xCumLenMap = lengthsToCumulativeBPCounts(x_len.chromosomes);
      var yCumLenMap = lengthsToCumulativeBPCounts(y_len.chromosomes);
      var inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);
      console.log(inlinedKSData);

      ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
      cb(ksDataObject);
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
  var cleanLenList =  _.each(len_list, function(chromosome) {
      chromosome.length = Number(chromosome.length);
      chromosome.gene_count = Number(chromosome.gene_count);
  });

  var ntLenList = _.chain(cleanLenList)
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

  var geLenList = _.chain(cleanLenList)
    .sortBy('gene_count')
    .reverse()
    .tap(function(x) { console.log(x); })
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.gene_count;
      return map;
    }, {
      total: 0
    })
    .value();

    return {nt: ntLenList, ge: geLenList};
}

// Compute absolute BP offset from chromosome and relative offset
function inlineKSData(ks, xmap, ymap) {
  _.each(ks, function(ksObj) {
    var xShift = xmap.nt[ksObj.x_chromosome_id];
    var yShift = ymap.nt[ksObj.y_chromosome_id];
    ksObj.nt.x_relative_offset += xShift;
    ksObj.nt.y_relative_offset += yShift;

    xShift = xmap.ge[ksObj.x_chromosome_id];
    yShift = ymap.ge[ksObj.y_chromosome_id];
    ksObj.ge.x_relative_offset += xShift;
    ksObj.ge.y_relative_offset += yShift;
  });
  return ks;
}

function createDataObj(ks, xmapPair, ymapPair) {
  var xmap = xmapPair.ge;
  var ymap = ymapPair.ge;
  var currentData = ks;
  ret = {};

  var spatialFilter = null;
  var dataFilter = null;

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
  }

  ret.getGEvNTMode = function() {
    return gentMode;
  };

  var order = 'minimum';
  ret.setOrder = function(newOrder) {
    order = newOrder;
    currentData = _.sortBy(currentData, ret.getSummaryField());
    if (order === 'minimum') {
      currentData.reverse();
    }
    ret.notifyListeners('order-change');
  };

  var sumField = 'logks';;
  ret.setSummaryField = function(field) {
    sumField = field;
    ret.removeDataFilter();
    ret.setOrder(order);
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

  ret.currentDataSummary = function(ticks) {
    var diff = ticks[1] - ticks[0];
    var bins = _.reduce(ticks, function(binList, tick) {
      binList.push({
        x: tick,
        dx: diff,
        y: 0
      });
      return binList;
    }, []);
    var summary = currentData;
    if (spatialFilter) {
      summary = _.filter(summary, function(dot) {
        return dot[gentMode].x_relative_offset >= spatialFilter[0][0] &&
          dot[gentMode].x_relative_offset <= spatialFilter[1][0] &&
          dot[gentMode].y_relative_offset >= spatialFilter[0][1] &&
          dot[gentMode].y_relative_offset <= spatialFilter[1][1];
      });
    }
    if (dataFilter) {
      summary = _.filter(summary, function(dot) {
        return dot[sumField] <= dataFilter[1] && dot[sumField] >= dataFilter[0];
      });
    }
    if (dataFilter) {
      _.each(bins, function(x) {
        x.active = x.x + x.dx >= dataFilter[0] && x.x < dataFilter[1];
      });
    } else {
      _.each(bins, function(x) {
        x.active = true;
      });
    }
    _.each(summary, function(dot) {
      _.each(bins, function(bin) {
        if (bin.x <= dot[sumField] && dot[sumField] < bin.x + bin.dx) {
          bin.y++;
        }
      });
    });
    return bins;
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
      var dataSplit = _.partition(passing, function(dot) {
        return dot[gentMode].x_relative_offset >= spatialFilter[0][0] &&
          dot[gentMode].x_relative_offset <= spatialFilter[1][0] &&
          dot[gentMode].y_relative_offset >= spatialFilter[0][1] &&
          dot[gentMode].y_relative_offset <= spatialFilter[1][1];
      });
      passing = dataSplit[0];
      failing = _.flatten([failing, dataSplit[1]], true);
    }
    if (dataFilter) {
      var dataSplit = _.partition(passing, function(x) {
        return x[sumField] < dataFilter[1] && x[sumField] > dataFilter[0];
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
  ret.setGEvNTMode('nt');
  return ret;
}

