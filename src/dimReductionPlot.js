import d3 from 'd3';
import numeric from 'numeric';
import { zipWith } from 'utils';
import { getController } from 'interactionController';

//usage:
//import { dr } from './dimReductionPlot';

var chromosomes;
var myKernel;

var x0_full;
var x0;

var data0;
var interactionController;
var svg;
var brush;
var dataObj;
var brushOption;
var brushedChromosomes;

function init(dataObj0, meta, kernelObj){
  brushedChromosomes = [];
  brushOption = 'highlight';
  brush = null;
  x0 = null;
  x0_full = null;
  data0 = null;

  dataObj = dataObj0;
  chromosomes = meta.genome_x.chromosomes;
  
  svg = d3.select('#dimReductionPlot');

  myKernel = kernelObj;
  var K = myKernel.getK();
  dr(K);

  dataObj.addListener(updateK);

  interactionController = getController();
  
  interactionController
  .addListener('dimReductionPlot-hover', showLabel_name)
  .addListener('dimReductionPlot-hover', highlight_name)
  .addListener('dimReductionPlot-dehover', hideLabels)
  .addListener('dimReductionPlot-dehover', dehighlight)
  .addListener('dimReductionPlot-brush', highlight)
  .addListener('dimReductionPlot-brush-empty', dehighlight)
  .addListener('dimReductionPlot-brush-empty', updateK)

  .addListener('dimReductionPlot-brush-options', changeBrushOption);
  
  interactionController
  .addListener('dimReductionPlot-brush-stop', addChromosomeFilter)
  .addListener('dimReductionPlot-brush-empty', removeChromosomeFilter);
  
  interactionController
  .addListener('heatmap-label-hover', showLabel_name)
  .addListener('heatmap-label-hover', highlight_name)
  .addListener('heatmap-label-dehover', hideLabels)
  .addListener('heatmap-label-dehover', dehighlight);

}


function changeBrushOption(option){
  brushOption = option;
  // if(option=='highlight'){
  // }else if(option == 'subselect'){
  // }

  // interactionController
  // .removeListener('dimReductionPlot-brush-stop', addChromosomeFilter)
  // .removeListener('dimReductionPlot-brush-empty', removeChromosomeFilter);

  // interactionController
  // .addListener('dimReductionPlot-brush-stop', addChromosomeFilter)
  // .addListener('dimReductionPlot-brush-empty', removeChromosomeFilter);

}



function addChromosomeFilter(names){
  dataObj.addDimReductionPlotChromosomeFilter(names, 
    'dimReductionPlot-filter-stop');

  if(brushOption === 'subselect'){
    // updateK('dimReductionPlot-brush-stop', names);
    //hide brush
    var epsilon = 0.01;
    brush.extent([[-epsilon,-epsilon],[epsilon,epsilon]]);
    svg.select('.brush').call(brush);
  }
}


function removeChromosomeFilter(){
  brushedChromosomes = [];
  
  dataObj
  .removeDimReductionPlotChromosomeFilter('dimReductionPlot-brush-stop');
}



function highlight_name(name){
  highlight([name]);
}


function highlight(names){
  names = new Set(names);
  svg.selectAll('.dot')
  .attr('stroke-width', function(d){
    if (names.has(d.name)){
      return 2;
    }else{
      return 0;
    }
  });
}


function dehighlight(){
  svg.selectAll('.dot')
  .attr('stroke-width', 0);
}



function showLabel_name(name){

  //change this dim reduction plot
  svg.selectAll('.label')
  .filter( (d,j) => d.name==name )
  .text(d=> d.name)
  .attr('opacity', 1);
}


function hideLabels(){
  //change this dim reduction plot
  svg.selectAll('.label')
  .text(d=> d.shortName);
  // .attr('opacity', 0);
}


function dr(K, chrNames){
  //dimReduction or 'dr'
  drLocal(K, chrNames);
}


function dissimilarity(x1, x2){
  var res = numeric.sub(x1,x2);
  res = numeric.norm2(res);
  return res;
}


function procrustes(x1, x2){
  //orthogonal procrustes
  //// X2' X1 = U ∑ V'

  var svd = numeric.svd(numeric.dot(numeric.transpose(x2), x1));

  //// Q = VU'
  var q = numeric.dot(svd.V, numeric.transpose(svd.U));
  
  ////scale s
  //// s = trace(X2' X1 Q) / trace(Q' X1' X1 Q)

  /*var t = numeric.dot(numeric.dot(numeric.transpose(x2), x1), q);
  t = numeric.mul(t, numeric.diag(t.map(d=>1)) );

  var d = numeric.dot(x1, q);
  d = numeric.dot(numeric.transpose(d), d);
  d = numeric.mul(d, numeric.diag(d.map(_=>1)) );

  var s = numeric.sum(t) / numeric.sum(d);
  console.log(s);
  q = numeric.mul(q, s);*/

  var res = numeric.dot(x1, q);
  return res;

}


function submatrix(K, subIndices){
  var res = [];
  subIndices = new Set(subIndices);
  for (var i = 0; i < K.length; i++) {
    if (subIndices.has(i)){
      res.push([]);
    }else{
      continue;
    }
    for (var j = 0; j < K[0].length; j++) {
      if (subIndices.has(j)){
        res[res.length-1].push(K[i][j]);
      }
    }
  }
  return res;
}


function drLocal(K, chrNames){


  //kernel PCA running on client(browser)
  if(chrNames !== undefined){
    var chrNamesSet = new Set(chrNames);
    var subIndices = d3.range(K.length)
    .filter((d,i)=>chrNamesSet.has(chromosomes[i].name));
    K = submatrix(K, subIndices);
    //reset the procrustes reference
    x0 = x0_full.filter((d,i)=>(subIndices.indexOf(i)>-1));
  }else{
    chrNames = chromosomes.map(d=>d.name);
    x0 = x0_full;
  }

  
  //centralize K
  var ones = [ d3.range(K.length).map(d=>1) ];
  ones = numeric.dot(numeric.transpose(ones), ones);
  var identity = numeric.identity(K.length);
  var C = numeric.sub(identity, numeric.div(ones, K.length));
  K = numeric.dot(K, C);
  K = numeric.dot(C, K);


  var svd = numeric.svd(K);  

  //TODO make it faster by explicit loop
  var x = numeric.dot(svd.U, numeric.diag(numeric.sqrt(svd.S.slice(0,2))));

  console.log(chrNames);
  console.log(x);
  console.log(x0);

  if(x0_full === null){
    x0_full = x;
  }

  if(x0 === null){
    x0 = x; //option1: this make procrustes against initial plot
    data0 = x.map(function(d,i){
      return {
        x: d[0],
        y: d[1],
        name: chrNames[i],
        shortName: chrNames[i].split('P')[0],
        category: i
      };
    });
  }

  x = procrustes(x, x0);
  var data = x.map(function(d,i){
    return {
      x: d[0],
      y: d[1],
      name: chrNames[i],
      shortName: chrNames[i].split('P')[0],
      category: i//cat[i]
    };
  });

  updatePlot(data, data0);

}


function drPOST(K){
  var cat = [0,0,0,0,0,0,0,0,
             1,1,1,1,1,2,2,2,3];

  K = JSON.stringify(K);
  d3.xhr('/dr')
    .header('Content-Type', 'application/json')
    .post(K, function(e,d){
      var x = JSON.parse(d.responseText);//list of [x,y] coordinates
      var data = x.map(function(d,i){
        return {
          x: d[0],
          y: d[1],
          name: chromosomes[i].name,
          category: i
        };
      });
      updatePlot(data);
    });
}


function updateK(type, chrNames){
  type = type || '';
  console.log(type);

  var K = myKernel.getK();

  if(chrNames === undefined){
    if(brushedChromosomes!==null && 
      brushedChromosomes.length > 0 ){
      chrNames = brushedChromosomes;
    }
  }else{
    if(chrNames.length == 0){
      chrNames = chromosomes.map(d=>d.name);
    }
  }

  //draw all chromosome PCA if the call is not from itself
  if(brushOption =='highlight'){
    if(type.indexOf('dimReductionPlot') === -1){
      dr(K);
    }
  }else if(brushOption =='subselect'){
    dr(K, chrNames);
  }
}



function makeLinks(data){
  var res = [];
  for (var i = 0; i < data.length; i++) {
    for (var j = i+1; j < data.length; j++) {
      var di = Object.assign({i:i}, data[i]);
      var dj = Object.assign({i:j}, data[j]);
      res.push([di, dj]);
    }
  }
  return res;
}



var vmax = null;

function updatePlot(data, data0){
  console.log('updatePlot');

  var width = svg.style('width');
  var height = svg.style('height');
  width = +width.substring(0,width.length-2);
  height = +height.substring(0,height.length-2);

  var margin = 0.1*Math.min(width, height);
  var side = Math.min(height,width);

  vmax = Math.max( 
    vmax, 
    d3.extent(data, d=>Math.max(Math.abs(d.x), Math.abs(d.y))  )[1]
  );

  var sx = d3.scale.linear()
  .domain([-vmax, vmax])
  .range([margin, side-margin]);

  var sy = d3.scale.linear()
  .domain([-vmax, vmax])
  .range([side-margin, margin]);

  var sc = d3.scale.category10();

  var ax = d3.svg.axis()
  .scale(sx)
  .orient('bottom')
  .ticks(3); 

  var ay = d3.svg.axis()
  .scale(sy)
  .orient('left')
  .ticks(3);

  // add brush
  if(brush === null){
    brush = d3.svg.brush();
  }
  brush.x(sx).y(sy);

  brush.on('brush', function(){
    var x0 = brush.extent()[0][0];
    var x1 = brush.extent()[1][0];
    var y0 = brush.extent()[0][1];
    var y1 = brush.extent()[1][1];

    var chr = data.filter(function(d){
      return (x0 <= d.x && d.x <= x1 && y0 <= d.y && d.y <= y1);
    }).map(d=>d.name);


    interactionController
    .notifyListeners('dimReductionPlot-brush', chr);

    // if(brushOption == 'highlight' 
    //   && brushedChromosomes.join('') == chr.join('') ){
    //   interactionController
    //   .notifyListeners('dimReductionPlot-brush-stop', brushedChromosomes);
    // }

    brushedChromosomes = chr;

  })
  .on('brushend', function(){
    if(brush.empty()){
      interactionController
      .notifyListeners('dimReductionPlot-brush-empty');
      updateK();
    }else{
      interactionController
      .notifyListeners('dimReductionPlot-brush-stop', brushedChromosomes);
    }
  });

  svg.selectAll('.brush')
  .data([0])
  .enter()
  .append('g')
  .attr('class', 'brush');

  svg.select('.brush')
  .call(brush);


  //remove additional visual elements
  svg.selectAll('.label')
  .data(data, d=>d.name)
  .exit()
  .remove();

  // svg.selectAll('.trajectoryLine')
  // .data(zipWith((a,b)=>[a,b], data0, data), d=>d[0].name)
  // .exit()
  // .remove();

  



  //append additional elements
  svg.selectAll('.label')
  .data(data, d=>d.name)
  .enter()
  .append('text')
  .attr('class', 'label')
  .attr('opacity', 1);
    
  // svg.selectAll('.trajectoryLine')
  // .data(zipWith((a,b)=>[a,b], data0, data), d=>d[0].name)
  // .enter()
  // .append('line')
  // .attr('class', 'trajectoryLine')
  // .attr('stroke', '#aaa');

  svg.selectAll('.dot')
  .data(data, d=>d.name)
  .exit()
  .remove();

  svg.selectAll('.dot')
  .data(data, d=>d.name)
  .enter()
  .append('circle')
  .attr('class', 'dot')
  .attr('r', 7)
  .attr('stroke', 'yellow')
  .attr('stroke-width', 0)
  .attr('fill', '#08519c')
  .each(function(d){
    this.parentNode.appendChild(this);//bring to front
  });

  //select all
  var dots = svg.selectAll('.dot');
  var labels = svg.selectAll('.label');
  // var trajectories = svg.selectAll('.trajectoryLine');

  dots.select('title')
    .text(d=> d.name);

  // hovering on pointhighlights the corresponding
  // diagonal entry in heatmap (this is a bit dirty)
  // TODO delegate the heatmap part to heatmap.js
  // and show the label
  dots.on('mouseover', function(d,i){
    interactionController
    .notifyListeners('dimReductionPlot-hover', d.name);

  });

  dots.on('mouseout', function(d,i){
    interactionController
    .notifyListeners('dimReductionPlot-dehover');
  });


  //update dot positions
  dots
  .transition()
  .duration(500)
  .attr('cx', d=>sx(d.x) )
  .attr('cy', d=>sy(d.y) );


  labels
  .transition()
  .duration(500)
  .text(d=> d.shortName)
  .attr('x', function(d,i){
    d.x = data[i].x;
    // return sx(d.x);
    return sx(d.x)+15*Math.cos(i/chromosomes.length*2*Math.PI);
  })
  .attr('y', function(d,i){
    d.y = data[i].y;
    // return sy(d.y);
    return sy(d.y)+15*Math.sin(i/chromosomes.length*2*Math.PI);
  });
  
  // trajectories
  // .transition()
  // .duration(100)
  // .attr('x1', d=>sx(d[0].x) )
  // .attr('y1', d=>sy(d[0].y) )
  // .attr('x2', d=>sx(d[1].x) )
  // .attr('y2', d=>sy(d[1].y) );


  //axes
  svg.selectAll('.x.axis')
  .data([1])
  .enter()
  .append('g')
  .attr('class', 'x axis');

  svg.selectAll('.x.axis')
  .attr('transform', 'translate(0,'+sy.range()[0]+')')
  .call(ax);


  svg.selectAll('.y.axis')
  .data([1])
  .enter()
  .append('g')
  .attr('class', 'y axis');

  svg.selectAll('.y.axis')
  .attr('transform', 'translate('+sx.range()[0]+',0)')
  .call(ay);

}

exports.init = init;
