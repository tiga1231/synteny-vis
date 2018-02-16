import crossfilter from 'crossfilter2';
import d3 from 'd3';
import { zipObject } from './utils';
import { f } from './kernel';


function createDataObj(syntenyDots, xmapPair, ymapPair) {

  const xmap = xmapPair.nt;
  const ymap = ymapPair.nt;
  const ret = {};

  const cross = crossfilter(syntenyDots);

  const cross_all = cross.dimension(x => x.logks);
  const cross_x = cross.dimension(x => x.x_relative_offset);
  const cross_y = cross.dimension(x => x.y_relative_offset);

  const cross_chromosomePairs_heatmap = 
  cross.dimension(d => d.x_chromosome_id+'_'+d.y_chromosome_id);
  const cross_chromosomePairs_dimReductionPlot = 
  cross.dimension(d => d.x_chromosome_id+'_'+d.y_chromosome_id);

  const cross_chromosomePairs = 
  cross.dimension(d => d.x_chromosome_id+'_'+d.y_chromosome_id);

  const g_chromosomePairs
  = cross_chromosomePairs.group().reduceSum(d => f(+d.ks) );

  ret.getKernelPairs = function(){
    return g_chromosomePairs.all();
  };


  const fields = ['logks', 'logkn', 'logknks'];
  const filters = zipObject(
    fields,
    fields.map(field => cross.dimension(x => x[field]))
  );


  ret.getXLineOffsets = () => Object.values(xmap).sort((a, b) => a - b);

  ret.getYLineOffsets = () => Object.values(ymap).sort((a, b) => a - b);

  ret.getXLineNames = function() {
    return filterMapForNames(xmap);
  };

  ret.getYLineNames = function() {
    return filterMapForNames(ymap);
  };

  function filterMapForNames(map) {
    return Object.keys(map)
      .sort((a, b) => map[a] - map[b])
      .filter(x => x !== 'total');
  }

  ret.currentData = function currentData() {
    return {
      raw: syntenyDots,
      active: cross_all.top(Infinity)
    };
  };

  ret.currentDataSummary = function currentDataSummary(raw_ticks, field) {
    const ticks = raw_ticks.map(x => x).sort((a, b) => a - b);
    const group = filters[field].group(x => ticks.find(t => t >= x));
    const dx = ticks[1] - ticks[0];

    return function() {
      const groupList = group.top(Infinity);
      const groups = zipObject(
        groupList.map(x => x.key),
        groupList.map(x => x.value)
      );

      return ticks.map(
        tick => ({
          x: Number(tick),
          y: Number(groups[tick] || 0),
          dx
        })
      );
    };
  };


  ret.addHeatmapChromosomeFilter = function(xyChromosomePairs, typeHint){
    xyChromosomePairs = new Set(
      xyChromosomePairs.map(pair=>pair[0]+'_'+pair[1])
    );
    cross_chromosomePairs_heatmap.filterFunction(d=>xyChromosomePairs.has(d));

    filterDescription.heatmapChromosomes = xyChromosomePairs;

    ret.notifyListeners(typeHint);
  };

  ret.removeHeatmapChromosomeFilter = function(typeHint){
    cross_chromosomePairs_heatmap.filterAll();
    filterDescription.heatmapChromosomes = null;
    ret.notifyListeners(typeHint);
  };


  ret.addDimReductionPlotChromosomeFilter = function(chromosomeNames, typeHint){
    chromosomeNames = new Set(chromosomeNames);
    cross_chromosomePairs_dimReductionPlot.filterFunction(function(d){
      var namePair = d.split('_');
      return chromosomeNames.has(namePair[0]) 
        && chromosomeNames.has(namePair[1]);
    });
    filterDescription.drPlotChromosomes = chromosomeNames;

    ret.notifyListeners(typeHint || '');
  };

  ret.removeDimReductionPlotChromosomeFilter = function(typeHint){
    cross_chromosomePairs_dimReductionPlot.filterAll();
    filterDescription.drPlotChromosomes = null;
    ret.notifyListeners(typeHint);
  };




  var filterDescription = {
  };

  ret.addSpatialFilter = function(extents, typeHint) {
    filterDescription.x = [extents[0][0], extents[1][0]];
    filterDescription.y = [extents[0][1], extents[1][1]];
    cross_x.filter([extents[0][0], extents[1][0]]);
    cross_y.filter([extents[0][1], extents[1][1]]);
    ret.notifyListeners(typeHint);
  };

  ret.removeSpatialFilter = function(typeHint) {
    filterDescription.x = null;
    filterDescription.y = null;
    cross_x.filterAll();
    cross_y.filterAll();
    ret.notifyListeners(typeHint);
  };


  ret.dataExtent = {};
  ret.getDataExtent = function(){
    return ret.dataExtent;
  };

  ret.addDataFilter = function(extent, field, typeHint) {
    ret.dataExtent[field] = extent;
    filterDescription[field] = extent;
    filters[field].filter(extent);
    ret.notifyListeners(typeHint || 'data');
  };

  ret.removeDataFilter = function(field) {
    delete ret.dataExtent[field];
    filterDescription[field] = null;
    filters[field].filterAll();
    ret.notifyListeners('data-stop');
  };

  const listeners = [];
  //add a function to the list
  ret.addListener = function(x) {
    listeners.push(x);
  };

  ret.clearListeners = function() {
    while(listeners.length > 0) listeners.pop();
  };

  ret.getFilterDescription = function() {
    return filterDescription;
  };
  
  ret.notifyListeners = function(typeOfChange) {
    listeners.forEach(f => f(typeOfChange));
  };

  return ret;
}

exports.createDataObj = createDataObj;

/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
