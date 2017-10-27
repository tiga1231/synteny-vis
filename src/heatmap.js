import d3 from 'd3';
import kernel from './kernel';
import numeric from 'numeric';


var MyKernel;
var chromosomes;

function initPlot(dataObj, meta){

  chromosomes = meta.genome_x.chromosomes;

  MyKernel = kernel.createKernel(dataObj, meta);
  MyKernel.computeK();
  var K = MyKernel.getK();
  var data = genData(K);
  updatePlot(data, chromosomes);
  dataObj.addListener(updateK);
}


function genData(K){

  var res = [];
  for (var i = 0; i < K.length; i++) {
    for (var j = 0; j < K[i].length; j++) {
      res.push({
        rowIndex: j,
        colIndex: i,
        value: K[i][j],
        tag: K[i][j]
      });
    }
  }
  return res;
}


function updateK(type){

  MyKernel.computeK();
  var K = MyKernel.getK();
  var data = genData(K);
  updatePlot(data, chromosomes);

}



function updatePlot(data){

  var svg = d3.select('#heatmap');

  var width = svg.style('width');
  var height = svg.style('height');
  width = +width.substring(0,width.length-2);
  height = +height.substring(0,height.length-2);

  var margin = 0.1*Math.min(width, height);
  var side = Math.min(height,width);

  var vmax = d3.max(data, d=>d.rowIndex);
  var sx = d3.scale.linear()
    .domain([0, vmax+1])
    .range([margin, side-margin]);

  var sy = d3.scale.linear()
    .domain([-1, vmax])
    .range([side-margin, margin]);

  var sc = d3.scale.linear()
  .domain([0,1])
  .range(['#deebf7', '#3182bd']);

  var ax = d3.svg.axis().scale(sx).orient('bottom'); 
  var ay = d3.svg.axis().scale(sy).orient('left');


  var boxes = svg.selectAll('.box')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'box');

  boxes.append('title')
    .text(d=> d.tag);

  boxes = svg.selectAll('.box')
    .attr('x', d=>sx(d.colIndex) )
    .attr('y', d=>sy(d.rowIndex) )
    .attr('width', (side-2*margin)/(vmax+1) )
    .attr('height', (side-2*margin)/(vmax+1) )
    .attr('fill', d=>sc(d.value) );

  svg.selectAll('title')
    .data(data)
    .text(d=>d.tag);
  /*svg.selectAll('.x.axis')
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
    .call(ay);*/
  
}

exports.initPlot = initPlot;
