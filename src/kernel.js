import math from 'mathjs';
import d3 from 'd3';

function createKernel(dataObj, meta){
  var Kernel = {};

  var chromosomes = meta.genome_x.chromosomes;
  var chrNames = chromosomes.map(d=>d.name);
  var size = chromosomes.length;

  Kernel.computeK = function(){
    var K = math.zeros(size, size)._data;
    var data = Kernel.getData();
    for (var i = 0; i < data.length; i++) {
      var name1 = data[i].x_chromosome_id;
      var name2 = data[i].y_chromosome_id;
      var i1 = chrNames.indexOf(name1);
      var i2 = chrNames.indexOf(name2);
      K[i1][i2] += f(data[i].ks)
        /Math.sqrt(chromosomes[i1].gene_count*chromosomes[i2].gene_count);
      K[i1][i2] = Math.min(1,K[i1][i2]);
    }
    for (i = 0; i < size; i++) {
      K[i][i] = 1;
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

  Kernel.computeK();
  dataObj.addListener(Kernel.computeK);
  return Kernel;
}


function f(ks){
  return +Math.exp(-ks);
}

exports.createKernel = createKernel;

