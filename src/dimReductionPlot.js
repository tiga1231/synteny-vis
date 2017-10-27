import d3 from 'd3';
import kernel from './kernel';
import numeric from 'numeric';
//usage:
//import { dr } from './dimReductionPlot';

var MyKernel;
var chromosomes;

function initPlot(dataObj, meta){
  console.log(meta);
  chromosomes = meta.genome_x.chromosomes;

  MyKernel = kernel.createKernel(dataObj, meta);
  MyKernel.computeK();
  var K = MyKernel.getK();
  dr(K);
  dataObj.addListener(updateK);
}


function dr(K){
  drClient(K);
}


function drClient(K){
  //local kernel PCA
  var ones = [ d3.range(K.length).map(d=>1) ];
  ones = numeric.dot(numeric.transpose(ones), ones);
  var identity = numeric.identity(K.length);
  var C = numeric.sub(identity, numeric.div(ones, K.length));
  K = numeric.dot(K, C);

  var svd = numeric.svd(K);
  var x = numeric.dot(svd.U, numeric.diag(numeric.sqrt(svd.S)));

  var data = x.map(function(d,i){
    return {
      x: d[0],
      y: d[1],
      name: chromosomes[i].name,
      category: i//cat[i]
    };
  });

  var svg = d3.select('#dimReductionPlot');
  updatePlot(svg, data);

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
          category: i//cat[i]
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
    MyKernel.computeK();
    var K = MyKernel.getK();
    dr(K);
  }/*else if(type=='data'){
    MyKernel.computeK();
    K = MyKernel.getK();
    dr(K);
  }*/

}



function updatePlot(svg, data){

  var width = svg.style('width');
  var height = svg.style('height');
  width = +width.substring(0,width.length-2);
  height = +height.substring(0,height.length-2);

  var margin = 0.1*Math.min(width, height);
  var side = Math.min(height,width);

  var vmax = d3.extent(data, d=>Math.max(Math.abs(d.x), Math.abs(d.y))  )[1];
  var sx = d3.scale.linear()
    .domain([-vmax, vmax])
    .range([margin, side-margin]);
  var sy = d3.scale.linear()
    .domain([-vmax, vmax])
    .range([side-margin, margin]);

  var sc = d3.scale.category10();

  var ax = d3.svg.axis().scale(sx).orient('bottom'); 
  var ay = d3.svg.axis().scale(sy).orient('left');

  //TODO cache data for alignement
  //svg.selectAll('.dot').remove();
  //svg.selectAll('.axis').remove();

  var dots = svg.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'dot');

  dots.append('title')
  .text(d=> d.name);

  dots = svg.selectAll('.dot')
    .attr('cx', d=>sx(d.x) )
    .attr('cy', d=>sy(d.y) )
    .attr('r', 5 )
    .attr('fill', d=>sc(d.category) );

  

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
