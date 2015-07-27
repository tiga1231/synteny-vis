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

      var ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
      cb(inlinedKSData, {
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
    .value();
}

function ksLineToSyntenyDot(line) {
  var fields = line.split(',');
  return {
    ks: Number(fields[0]),
    kn: Number(fields[1]),
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

var i = 0;
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
    ksObj.logks = Math.log(Number(ksObj.ks)) / Math.log(10);
  });
  return ks;
}

function createDataObj(ks, xmap, ymap) {
  ret = {};
  var currentData = ks;
  _.each(ks, function(d) {
    d.xmin = d.xmax = d.nt.x_relative_offset;
    d.ymin = d.ymax = d.nt.y_relative_offset;
  });
  var bvh = bvh_build(ks);

  var spatialFilter = null;
  var dataFilter = null;


  ret.getXLineOffsets = function() {
    return _.values(xmap);
  };

  ret.getYLineOffsets = function() {
    return _.values(ymap);
  };

  ret.currentData = function() {
    return currentData;
  };

  ret.addSpatialFilter = function(extents) {
    spatialFilter = extents;
    updateData();
  };

  ret.removeSpatialFilter = function() {
    spatialFilter = null;
    updateData();
  };

  ret.addDataFilter = function(extent) {
    dataFilter = extent;
    updateData();
  };

  ret.removeDataFilter = function() {
    dataFilter = null;
    updateData();
  }

  function updateData() {
    var failing = [];
    var passing = [];
    if(spatialFilter) {
      passing = bvh_find(bvh, spatialFilter);
      failing = bvh_find_complement(bvh, spatialFilter);
    }
    if(dataFilter) {
      var dataSplit = _.partition(currentData, function(x) {
        return x.ks < dataFilter[1] && x.ks > dataFilter[0];
      });
      passing = _.flatten(passing, dataSplit[0]);
      failing = _.flatten(failing, dataSplit[1]);
    }
    _.each(passing, function(x) { x.active = true; });
    _.each(failing, function(x) { x.active = false; });
  }

  return ret;
}

