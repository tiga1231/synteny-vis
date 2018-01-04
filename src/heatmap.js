import d3 from 'd3';
import numeric from 'numeric';
import { SYNTENY_MARGIN } from 'constants';
import {getController} from 'interactionController';


var myKernel;
var chrNames;
var interactionController;
var margin, side, sxLabel;
var svg;

function init(dataObj, meta, kernel){
  svg = d3.select('#heatmap');
  var chromosomes = meta.genome_x.chromosomes;
  chrNames = chromosomes.map(d=>d.name);

  myKernel = kernel;
  var K = myKernel.getK();
  var data = genData(K);
  redraw(data, chrNames);
  //data related callback
  dataObj.addListener(updateK);


  interactionController = getController();
  interactionController.addListener('heatmap-hover', hightlight_ij);
  interactionController.addListener('heatmap-dehover', dehighlight);

  interactionController.addListener('dimReductionPlot-hover', hightlight_ii);
  interactionController.addListener('dimReductionPlot-dehover', dehighlight);

}


function hightlight_ii(args){
  hightlight_ij({i:args.i, j:args.i});
}

function hightlight_ij(args){
  var i = args.i;
  var j = args.j;

  //hightlight box(i,j)
  svg.selectAll('.box')
  .filter(function(e){
    return e.rowIndex == i && e.colIndex == j;
  })
  .attr('stroke', 'yellow')
  .attr('stroke-width', 2) //equivalent to .raise() in d3.v4
  .each(function() {
    this.parentNode.appendChild(this);
  });

  //hightlight the chromosome name on the corresponding row 
  svg.selectAll('.chrNameLabel.y')
  .filter( (_,i2)=>i2==i)
  .attr('fill', 'orange');

  svg.select('.chrNameLabel.x')
  .text(chrNames[j])
  .attr('x', sxLabel(chrNames[j]))
  .attr('y', side-margin+15);

}


function dehighlight(){
  d3.selectAll('.box')
  .attr('stroke-width', 0);

  svg.selectAll('.chrNameLabel.y')
  .attr('fill', 'black');

  svg.select('.chrNameLabel.x')
  .text('');
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

  var K = myKernel.getK();
  var data = genData(K);
  redraw(data, chrNames);

}



function redraw(data, names){

  var width = svg.style('width');
  var height = svg.style('height');
  width = +width.substring(0,width.length-2);
  height = +height.substring(0,height.length-2);

  margin = SYNTENY_MARGIN;//0.1*Math.min(width, height);
  side = Math.min(height,width);

  var vmax = d3.max(data, d=>d.rowIndex);

  //heatmap sticks to the right
  var sx = d3.scale.linear()
    .domain([0, vmax+1])
    .range([width-side+margin, width-margin]);

  var sy = d3.scale.linear()
    .domain([-1, vmax])
    .range([side-margin, margin]);

  //for tick marks / tooltips / else
  sxLabel = d3.scale.ordinal()
  .domain(names)
  .rangePoints([
    width-side+margin+(side-2*margin)/names.length/2, 
    width-margin-(side-2*margin)/names.length/2
  ]);

  var syLabel = d3.scale.ordinal()
  .domain(names)
  .rangePoints([
    side-margin-(side-2*margin)/names.length/2, 
    margin+(side-2*margin)/names.length/2
  ]);


  var offDiagonalData = data.filter(d=>d.rowIndex!=d.colIndex);
  var sc = d3.scale.linear()
  //.domain([0,d3.max(offDiagonalData, d=>d.value)]) //adaptive colormap
  .domain([0,1])
  .range(['#deebf7', '#3182bd']);

  var ax = d3.svg.axis().scale(sxLabel).orient('bottom'); 
  var ay = d3.svg.axis().scale(syLabel).orient('left');


  var boxes = svg.selectAll('.box')
  .data(data, d=>d.rowIndex+'_'+d.colIndex)
  .enter()
  .append('rect')
  .attr('class', 'box');

  boxes.append('title');

  boxes = svg.selectAll('.box')
  .attr('x', d=>sx(d.colIndex) )
  .attr('y', d=>sy(d.rowIndex) )
  .attr('width', (side-2*margin)/(vmax+1) )
  .attr('height', (side-2*margin)/(vmax+1) )
  .attr('fill', function(d){
    return sc(d.value);
    // }
  })
  .each(function(d){
    d3.select(this)
    .selectAll('title')
    .text(function(){
      return (''+d.tag).slice(0,5);
    });
  });

  svg.selectAll('.chrNameLabel.x')
    .data([''])
    .enter()
    .append('text')
    .attr('class', 'chrNameLabel x');

  var chrNameLabelX = svg.selectAll('.chrNameLabel.x')
    .attr('fill', 'black')
    .style('text-anchor', 'middle');


  svg.selectAll('.chrNameLabel.y')
    .data(chrNames)
    .enter()
    .append('text')
    .attr('class', 'chrNameLabel y');

  var chrNameLabelY = svg.selectAll('.chrNameLabel.y')
    .attr('fill', 'black')
    .style('text-anchor', 'end')
    .attr('x', Math.max(width-side+margin-10, 20))
    .attr('y', (d,i)=>syLabel(chrNames[i]))
    .text(d=>d);


  boxes.on('mouseover', function(d){

    interactionController
    .notifyListeners('heatmap-hover', {
      i: d.rowIndex,
      j: d.colIndex
    });
  });

  boxes.on('mouseout',function(){

    interactionController
    .notifyListeners('heatmap-dehover', {});


    
  });


  /*
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
    .call(ay);*/
  
  
}


exports.init = init;
