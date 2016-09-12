import _ from 'lodash/fp';
import d3 from 'd3';
import queue from 'd3-queue';
import sv from './synteny-vis';
import crossfilter from 'crossfilter';

exports.makeSyntenyDotPlot = function({
    data_url,
    element_id,
    genome_x,
    genome_y
  }) {
  queue.queue()
    .defer(d3.text, data_url)
    .await(function(err, ks) {
      if (err) {
        console.log(err);
        return;
      }

      // Dirty hacks to make files with no ks work:
      const have_ks = data_url.endsWith('.ks');
      if (!have_ks) {
        const random = () => Math.random() * 3 + 2;
        ks = ks.split('\n')
          .map(x => x[0] === '#' ? x : `${random()},${random()},` + x)
          .join('\n');
      }

      const x_name = genome_x.name;
      const y_name = genome_y.name;

      const ksData = ksTextToObjects(ks);
      const xCumLenMap = lengthsToCumulativeBPCounts(genome_x.chromosomes);
      const yCumLenMap = lengthsToCumulativeBPCounts(genome_y.chromosomes);
      const inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);

      const ksDataObject = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
      console.log('Total synteny dots:', ksDataObject.currentData().raw.length);
      sv.controller(ksDataObject, element_id, {x_name, y_name, have_ks});
    });
};

function ksTextToObjects(text) {
  /* .ks files are delimited with a combination of tabs and double bars. */
  const csvLines = text
    .replace(/\|\|/g, ',')
    .replace(/\t/g, ',')
    .replace(' ', '')
    .split('\n');

  const dots = _(csvLines)
    .filter(line => line && line[0] !== '#')
    .map(ksLineToSyntenyDot)
    .filter(x => x)
    .value();

  const min_logks = _(dots)
    .filter(line => isFinite(line.logks))
    .map(line => line.logks)
    .min();
  const min_logkn = _(dots)
    .filter(line => isFinite(line.logkn))
    .map(line => line.logkn)
    .min();

  return _.map(x => {
    x.logks = isFinite(x.logks) ? x.logks : min_logks;
    x.logkn = isFinite(x.logkn) ? x.logkn : min_logkn;
    x.logknks = x.logkn - x.logks;
    return x;
  }, dots);
}

function ksLineToSyntenyDot(line) {
  const fields = line.split(',');

  if(fields[0] === 'NA' || fields[1] === 'NA') {
    return undefined;
  }

  const ks = Number(fields[0]);
  const kn = Number(fields[1]);
  const log10 = n => Math.log(n) / Math.log(10);

  return {
    ks,
    logks: log10(ks),
    kn,
    logkn: log10(kn),
    logknks: log10(kn) - log10(ks),
    x_chromosome_id: fields[3],
    y_chromosome_id: fields[15],
    x_feature_id: fields[9],
    y_feature_id: fields[21],
    x_relative_offset: Math.round((Number(fields[4]) + Number(fields[5])) / 2),
    y_relative_offset: Math.round((Number(fields[16]) + Number(fields[17])) / 2)
  };
}

function lengthsToCumulativeBPCounts(len_list) {
  const ntLenList = _(len_list)
    .sortBy('length')
    .reverse()
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.length;
      return map;
    }, {
      total: 0
    });

  const nameLenList = _(len_list)
    .sortBy('name')
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.gene_count;
      return map;
    }, {
      total: 0
    });

  const geneCounts = _.zipObject(
    _.map(_.get('name'), len_list),
    _.map(_.get('gene_count'), len_list)
  );

  return {
    nt: ntLenList,
    name: nameLenList,
    gene_counts: geneCounts
  };
}

// Compute absolute BP offset from chromosome and relative offset
function inlineKSData(ks, xmap, ymap) {
  return _.map(o => {
    const xShift = xmap.nt[o.x_chromosome_id];
    const yShift = ymap.nt[o.y_chromosome_id];
    return { 
      ...o,
      x_relative_offset: o.x_relative_offset + xShift,
      y_relative_offset: o.y_relative_offset + yShift
    };
  }, ks);
}

function createDataObj(syntenyDots, xmapPair, ymapPair) {
  const xmap = xmapPair.nt;
  const ymap = ymapPair.nt;
  const ret = {};

  const cross = crossfilter(syntenyDots);
  const cross_all = cross.dimension(x => x.logks);
  const cross_x = cross.dimension(x => x.x_relative_offset);
  const cross_y = cross.dimension(x => x.y_relative_offset);
  const fields = ['logks', 'logkn', 'logknks'];
  const filters = _.zipObject(
    fields,
    _.map(field => cross.dimension(x => x[field]), fields)
  );

  ret.getXLineOffsets = function() {
    return _.chain(xmap).values().sortBy().value();
  };

  ret.getYLineOffsets = function() {
    return _.chain(ymap).values().sortBy().value();
  };

  ret.getXLineNames = function() {
    return filterMapForNames(xmap);
  };

  ret.getYLineNames = function() {
    return filterMapForNames(ymap);
  };

  function filterMapForNames(map) {
    return _.chain(map)
      .toPairs()
      .sortBy('1')
      .map('0')
      .reject(x => x === 'total')
      .value();
  }

  ret.currentData = function currentData() {
    return {
      raw: syntenyDots,
      active: cross_all.top(Infinity)
    };
  };

  ret.currentDataSummary = function currentDataSummary(ticks, field) {
    const group = filters[field].group(x => ticks[_.sortedIndex(x, ticks)]);
    const dx = ticks[1] - ticks[0];

    return function() {
      const groupList = group.top(Infinity);
      const groups = _.zipObject(
        _.map(_.get('key'), groupList),
        _.map(_.get('value'), groupList)
      );

      return _.map(
        tick => ({
          x: Number(tick),
          y: Number(_.getOr(0, tick, groups)),
          dx
        }),
        ticks
      );
    };
  };

  ret.addSpatialFilter = function(extents, typeHint) {
    cross_x.filter([extents[0][0], extents[1][0]]);
    cross_y.filter([extents[0][1], extents[1][1]]);
    ret.notifyListeners(typeHint);
  };

  ret.removeSpatialFilter = function(typeHint) {
    cross_x.filterAll();
    cross_y.filterAll();
    ret.notifyListeners(typeHint);
  };

  ret.addDataFilter = function(extent, field, typeHint) {
    filters[field].filter(extent);
    ret.notifyListeners(typeHint || 'data');
  };

  ret.removeDataFilter = function(field) {
    filters[field].filterAll();
    ret.notifyListeners('data-stop');
  };

  const listeners = [];
  ret.addListener = function(x) {
    listeners.push(x);
  };
  ret.clearListeners = function() {
    while(listeners.length > 0) listeners.pop();
  };

  ret.notifyListeners = function(typeOfChange) {
    _.each(f => f(typeOfChange), listeners);
  };

  return ret;
}
