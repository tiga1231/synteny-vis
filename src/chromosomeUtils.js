import { zipObject } from './utils';

function chromosomesToCumulativeBPCounts(cList, orderFun) {
  const ntLenList = cList.slice()
    .sort(orderFun)
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.length;
      return map;
    }, {
      total: 0
    });

  const nameLenList = cList.slice()
    .sort((a, b) => a.name - b.name)
    .reduce(function(map, kv) {
      map[kv.name] = map.total;
      map.total += kv.gene_count;
      return map;
    }, {
      total: 0
    });

  const geneCounts = zipObject(
    cList.map(x => x.name),
    cList.map(x => x.gene_count)
  );

  return {
    nt: ntLenList,
    name: nameLenList,
    gene_counts: geneCounts
  };
}

// Compute absolute BP offset from chromosome and relative offset
function inlineKSData(ks, xmap, ymap) {
  return ks.map(o => {
    const xShift = xmap.nt[o.x_chromosome_id];
    const yShift = ymap.nt[o.y_chromosome_id];
    var result = Object.assign({}, o);
    return Object.assign(result, {
      x_relative_offset: o.x_relative_offset + xShift,
      y_relative_offset: o.y_relative_offset + yShift
    });
  });
}

exports.inlineKSData = inlineKSData;
exports.chromosomesToCumulativeBPCounts = chromosomesToCumulativeBPCounts;
