import d3 from 'd3';
import numeric from 'numeric';
import { zipWith } from 'utils';

//usage:
//import { dr } from './dimReductionPlot';

var chromosomes;
var myKernel;
var x0 = null;
var data0 = null;

function initPlot(dataObj, meta, kernelObj){

  chromosomes = meta.genome_x.chromosomes;

  x0 = null;
  myKernel = kernelObj;
  var K = myKernel.getK();
  dr(K);
  dataObj.addListener(updateK);

}


function dr(K){
  //dimReduction or "dr"
  drLocal(K);
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


function drLocal(K){
  //kernel PCA running on client(browser)

  //normalize K
  var ones = [ d3.range(K.length).map(d=>1) ];
  ones = numeric.dot(numeric.transpose(ones), ones);
  var identity = numeric.identity(K.length);
  var C = numeric.sub(identity, numeric.div(ones, K.length));
  K = numeric.dot(K, C);
  K = numeric.dot(C, K);

  var svd = numeric.svd(K);
  var x = numeric.dot(svd.U, numeric.diag(numeric.sqrt(svd.S.slice(0,2))));

  if(x0 === null){
    x0 = x; //option1: this make procrustes against initial plot
    data0 = x.map(function(d,i){
      return {
        x: d[0],
        y: d[1],
        name: chromosomes[i].name,
        category: i };
    });
  }

  x = procrustes(x, x0);

  //x0 = x; //option2: this make procrustes on prev plot

  var data = x.map(function(d,i){
    return {
      x: d[0],
      y: d[1],
      name: chromosomes[i].name,
      category: i//cat[i]
    };
  });

  var svg = d3.select('#dimReductionPlot');
  updatePlot(svg, data, data0);

}


function drPOST(K){
  var cat = [0,0,0,0,0,0,0,0,
             1,1,1,1,1,2,2,2,3];

  K = JSON.stringify(K);
  d3.xhr('/dr')
    .header('Content-Type', 'application/json')
    .post(K, function(e,d){
      var x = JSON.parse(d.responseText);//list of [x,y] coordinates
      var svg = d3.select('#dimReductionPlot');
      var data = x.map(function(d,i){
        return {
          x: d[0],
          y: d[1],
          name: chromosomes[i].name,
          category: i
        };
      });
      updatePlot(svg, data);
    });
}


function updateK(type){
  console.log(type);
  if(//type=='histogram-stop'
      true|| type=='data' || type=='data-stop'
    ){
    var K = myKernel.getK();
    dr(K);
  }/*else if(type=='data'){
    myKernel.computeK();
    K = myKernel.getK();
    dr(K);
  }*/

}


var vmax = null;

function updatePlot(svg, data, data0){

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

  var ax = d3.svg.axis().scale(sx).orient('bottom'); 
  var ay = d3.svg.axis().scale(sy).orient('left');

  
  svg.selectAll('.label')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'label')
    .attr('opacity', 0)
    .text(d=> d.name);
    
  svg.selectAll('.trajectoryLine')
    .data(zipWith((a,b)=>[a,b], data0, data))
    .enter()
    .append('line')
    .attr('class', 'trajectoryLine')
    .attr('stroke', '#aaa');

  
  svg.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('r', 5)
    .attr('fill', '#08519c');//d=>sc(d.category) );


  






  var dots = svg.selectAll('.dot');
  var labels = svg.selectAll('.label');
  var lines = svg.selectAll('.trajectoryLine');


  dots.append('title')
    .text(d=> d.name);

  // hovering on pointhighlights the corresponding
  // diagonal entry in heatmap (this is a bit dirty)
  // TODO delegate the heatmap part to heatmap.js
  // and show the label
  dots.on('mouseover', function(d,i){
    var svgHeatmap = d3.select('#heatmap');
    svgHeatmap.selectAll('.box')
      .filter(function(e){
        return e.rowIndex == i && e.colIndex == i;
      })
      .attr('stroke-width', 2)
      .attr('stroke', 'yellow');

    svg.selectAll('.label')
      .filter( (_,j) => i==j )
      .attr('opacity', 1);

  });

  dots.on('mouseout', function(d,i){
    var svgHeatmap = d3.select('#heatmap');
    svgHeatmap.selectAll('.box')
      .attr('stroke-width', 0);

    labels.attr('opacity', 0);
  });


  //update dot positions
  dots.transition()
    .duration(100)
    .attr('cx', d=>sx(d.x) )
    .attr('cy', d=>sy(d.y) );
    

  //update label positions
  labels.attr('x', d=>sx(d.x) )
    .attr('y', d=>sy(d.y) );

  lines.transition()
    .duration(100)
    .attr('x1', d=>sx(d[0].x) )
    .attr('y1', d=>sy(d[0].y) )
    .attr('x2', d=>sx(d[1].x) )
    .attr('y2', d=>sy(d[1].y) );


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

exports.initPlot = initPlot;
