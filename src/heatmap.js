import d3 from 'd3';
import numeric from 'numeric';
import { SYNTENY_MARGIN } from 'constants';
import { getController } from 'interactionController';


var myKernel;
var chrNames;
var interactionController;
var margin, side, sxLabel;
var svg;
var dataObj;
var brush = null;
var x0,x1,y0,y1;


function init(dataObj0, meta, kernel){
  dataObj = dataObj0;
  svg = d3.select('#heatmap');
  var chromosomes = meta.genome_x.chromosomes;
  chrNames = chromosomes.map(d=>d.name);

  myKernel = kernel;
  var K = myKernel.getK();
  var data = genData(K);
  redraw(data, chrNames);
  //data related callback
  dataObj.addListener(updateK);

  // dataObj.addHeatmapChromosomeFilter(
  //   [['2P.inui', '1P.cynomolgi']], 
  //   'heatmap-brush');


  interactionController = getController();
  // interactionController.addListener('heatmap-hover', highlight_ij);
  // interactionController.addListener('heatmap-dehover', dehighlight);
  // 
  interactionController
  .addListener('heatmap-brush', highlight_namePairs);
  interactionController
  .addListener('heatmap-brush-stop', dehighlight);
  

  interactionController
  .addListener('dimReductionPlot-hover', highlight_namePair);
  interactionController
  .addListener('dimReductionPlot-dehover', dehighlight);

  interactionController
  .addListener('dimReductionPlot-brush', highlight_dimReductionPlot_selection);
  // interactionController
  // .addListener('dimReductionPlot-brush-stop', black_cells);
  interactionController
  .addListener('dimReductionPlot-brush-empty',dehighlight);



}


function highlight_namePair(arg){
  var name = arg.name;
  var i = chrNames.indexOf(name);
  highlight_ii({i:i});
}


function highlight_namePairs(namePairs){

  namePairs = new Set(  namePairs.map(pair=>pair[0]+'_'+pair[1])  );

  svg.selectAll('.box')
  .attr('stroke-width', 0);

  svg.selectAll('.box')
  .filter(function(e){
    return namePairs.has(chrNames[e.colIndex]+'_'+chrNames[e.rowIndex]);
  })
  .attr('stroke', 'yellow')
  .attr('stroke-width', 2) 
  .each(function() {
    this.parentNode.appendChild(this);//equivalent to .raise() in d3.v4
  });

  svg.selectAll('.brush')
  .each(function() {
    this.parentNode.appendChild(this);
  });
}


function highlight_dimReductionPlot_selection(names){
  names = new Set(names);
  svg.selectAll('.box')
  .attr('stroke-width', 0);

  svg.selectAll('.box')
  .filter(function(e){
    return e.rowIndex==e.colIndex && names.has(chrNames[e.rowIndex]);
  })
  .attr('stroke', 'yellow')
  .attr('stroke-width', 2) 
  .each(function() {
    this.parentNode.appendChild(this);//equivalent to .raise() in d3.v4
  });

  svg.selectAll('.brush')
  .each(function() {
    this.parentNode.appendChild(this);
  });
}


function highlight_ii(args){
  highlight_ij({i:args.i, j:args.i});
}


function highlight_ij(args){
  var i = args.i;
  var j = args.j;

  //highlight box(i,j)
  svg.selectAll('.box')
  .filter(function(e){
    return e.rowIndex == i && e.colIndex == j;
  })
  .attr('stroke', 'yellow')
  .attr('stroke-width', 2) //equivalent to .raise() in d3.v4
  .each(function() {
    this.parentNode.appendChild(this);
  });

  //highlight the chromosome name on the corresponding row 
  svg.selectAll('.chrNameLabel.y')
  .filter( (_,i2)=>i2!=i)
  .attr('opacity', 0.3);

  svg.select('.chrNameLabel.x')
  .text(chrNames[j])
  .attr('x', sxLabel(chrNames[j]))
  .attr('y', side-margin+15);

  svg.selectAll('.brush')
  .each(function() {
    this.parentNode.appendChild(this);
  });


}


function dehighlight(){
  d3.selectAll('.box')
  .attr('stroke-width', 0);

  svg.selectAll('.chrNameLabel.y')
  .attr('opacity', 1);

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

  boxes.on('mouseout',function(d){
    interactionController
    .notifyListeners('heatmap-dehover', {
      i: d.rowIndex,
      j: d.colIndex
    });
  });


  if(brush === null){
    brush = d3.svg.brush();
  }
  brush.x(sx).y(sy);


  brush.on('brush', function(){
    if(!brush.empty()){
      //chromosome indices
      if(d3.event.mode == 'move'){
        x0 = Math.round(brush.extent()[0][0]);
        x1 = Math.round(brush.extent()[1][0]);
        y0 = Math.round(brush.extent()[0][1]);
        y1 = Math.round(brush.extent()[1][1]);
      }else{
        x0 = Math.floor(brush.extent()[0][0]);
        x1 = Math.ceil(brush.extent()[1][0]);
        y0 = Math.floor(brush.extent()[0][1]);
        y1 = Math.ceil(brush.extent()[1][1]);
      }
      // console.log('x:[', x0,x1,'] y:[',y0,y1,']');
      var pairs = [];
      for (var i = x0; i < x1; i++) {
        for (var j = y0+1; j < y1+1; j++) {
          pairs.push([chrNames[i], chrNames[j]]);
        }
      }
      dataObj.addHeatmapChromosomeFilter(pairs, 'heatmap-brush-stop');
      interactionController.notifyListeners('heatmap-brush', pairs);
    }
  })
  .on('brushend', function(){
    
    if(brush.empty()){
      dataObj.removeHeatmapChromosomeFilter('heatmap-brush-stop');
      //interactionController.notifyListeners('heatmap-brush-stop');
    }else{
      //snap to cell boundary
      brush.extent([[x0,y0],[x1,y1]]);
      d3.select('g.brush').call(brush);
    }
    interactionController.notifyListeners('heatmap-brush-stop');

  });

  svg.selectAll('.brush')
  .data([0])
  .enter()
  .append('g')
  .attr('class', 'brush');

  svg.select('.brush')
  .call(brush);



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
