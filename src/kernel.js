import math from 'mathjs';
import d3 from 'd3';

function createKernel(dataObj, meta){
  var Kernel = {};

  var chromosomes = meta.genome_x.chromosomes;
  var chrNames = chromosomes.map(d=>d.name);

  var chrNamesIndices = {};
  for (var i = 0; i < chrNames.length; i++) {
    chrNamesIndices[chrNames[i]] = i;
  }

  var size = chromosomes.length;
  
  var cumulatives = {};
  var data = dataObj.currentData().raw;
  data.sort(function(a, b){
    return d3.ascending(a.ks, b.ks);
  });
  for (i = 0; i < data.length; i++) {
    var xid = data[i].x_chromosome_id;
    var yid = data[i].y_chromosome_id;
    var ks = +data[i].ks;
    var key = xid + '_' + yid;
    if(key in cumulatives){
      var n = cumulatives[key].length;
      var last = cumulatives[key][n-1].value;
      cumulatives[key].push({ks:ks, value:last+f(ks)});
    }else{
      cumulatives[key] = [];
      cumulatives[key].push({ks:ks, value:0+f(ks)});
    }
  }

  Kernel.cumulatives = cumulatives;


  Kernel.computeK = function(){

    var K = math.zeros(size, size)._data;
    var pairs = dataObj.getKernelPairs();

    //compute the kernel by cross filtered data
    for (var i = 0; i < pairs.length; i++) {
      var key = pairs[i].key;
      var ksSum = pairs[i].value;
      var [chr1, chr2] = key.split('_');

      var row = chrNamesIndices[ chr1 ];
      var col = chrNamesIndices[ chr2 ];

      var c = Math.sqrt(chromosomes[row].gene_count
                          *chromosomes[col].gene_count);
      K[row][col] = ksSum / c;
                      
    }



    // //compute kernel based on current extent of histogram 
    // var extent = Kernel.getDataExtent();
    // if(extent !== null){
    //   for (var i = 0; i < size; i++) {
    //     for (var j = 0; j < size; j++){
    //       if(i==j){
    //         continue;
    //       }
    //       var name1 = chrNames[i];
    //       var name2 = chrNames[j];
    //       var key = name1 + '_' + name2;

    //       var iStart = Kernel.cumulatives[key]
    //       .binarySearch(extent[0], d=>d.ks);
    //       var iEnd = Kernel.cumulatives[key]
    //       .binarySearch(extent[1], d=>d.ks); 
    //       var y1,y2;
    //       var n = Kernel.cumulatives[key].length;

    //       if(iStart == -0.5){
    //         y1 = 0;
    //       }else if(iStart == Kernel.cumulatives[key].length-0.5){
    //         y1 = Kernel.cumulatives[key][n-1].value;
    //       }else{
    //         iStart = Math.ceil(iStart);
    //         y1 = Kernel.cumulatives[key][iStart].value;
    //       }

    //       if(iEnd == -0.5){
    //         y2 = 0;
    //       }else if(iEnd == Kernel.cumulatives[key].length-0.5){
    //         y2 = Kernel.cumulatives[key][n-1].value;
    //       }else{
    //         iEnd = Math.floor(iEnd);
    //         y2 = Kernel.cumulatives[key][iEnd].value;
    //       }

    //       var k = Math.max((y2-y1), 0) 
    //         / Math.sqrt(chromosomes[i].gene_count 
    //                    * chromosomes[j].gene_count);
    //       K[i][j] = k;
    //       K[i][j] = Math.min(1,K[i][j]);
    //     }
    //   }
    // }

    for (i = 0; i < size; i++) {
      K[i][i] += 1;
    }
    Kernel.K = K;



  };

  Kernel.getK = function(){
    //deep copy
    return JSON.parse(JSON.stringify(Kernel.K));
  };


  Kernel.getData = function(){
    return dataObj.currentData().active;
  };


  Kernel.getDataExtent = function(){
    var extent = dataObj.getDataExtent();
    if('logks' in extent){
      extent = extent['logks'];
      //TODO problem: 0 ks cast to minNonzeroKs in logks
      return [Math.exp(extent[0]), Math.exp(extent[1])]; 
    }else{
      return [-99, 9e9];
    }
  };


  Kernel.computeK();
  dataObj.addListener(Kernel.computeK);
  return Kernel;
}


Array.prototype.binarySearch = function(find, fkey) {
  var low = 0;
  var high = this.length - 1;
  var i;
  var count = 0;

  if(find < fkey(this[0])){
    return -0.5;
  }else if(find > fkey(this[this.length-1])){
    return this.length-0.5;
  }else if (find == fkey(this[0])){
    return 0;
  }else if(find == fkey(this[this.length-1])){
    return this.length-1;
  }

  while (low < high && count<this.length) {
    count+=1;
    i = Math.floor((low + high) / 2);
    if (find < fkey(this[i])){
      high = i;
      continue;
    }else if (fkey(this[i]) < find){
      low = i;
      continue;
    }else{
      high = i;
      low = i;
      break;
    }
    if(low+1 == high){
      break;
    }
  }
  return (high+low)/2;
};



function f(ks){
  ks = +ks;
  return Math.exp(-Math.pow(ks*0.83/1.0,2));
}

exports.f = f;
exports.createKernel = createKernel;

