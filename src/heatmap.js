import d3 from 'd3';
import numeric from 'numeric';


var myKernel;
var chrNames;
function initPlot(dataObj, meta, kernel){

  var chromosomes = meta.genome_x.chromosomes;
  chrNames = chromosomes.map(d=>d.name);

  myKernel = kernel;
  var K = myKernel.getK();
  var data = genData(K);
  updatePlot(data, chrNames);
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

  var K = myKernel.getK();
  var data = genData(K);
  updatePlot(data, chrNames);

}



function updatePlot(data, names){

  var svg = d3.select('#heatmap');

  var width = svg.style('width');
  var height = svg.style('height');
  width = +width.substring(0,width.length-2);
  height = +height.substring(0,height.length-2);

  var margin = 0.1*Math.min(width, height);
  var side = Math.min(height,width);

  var vmax = d3.max(data, d=>d.rowIndex);

  //heatmap sticks to the right
  var sx = d3.scale.linear()
    .domain([0, vmax+1])
    .range([width-side+margin, width-margin]);

  var sy = d3.scale.linear()
    .domain([-1, vmax])
    .range([side-margin, margin]);

  //for tick marks / tooltips / else
  var sxLabel = d3.scale.ordinal()
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
  .domain([0,d3.max(offDiagonalData, d=>d.value)])
  .range(['#deebf7', '#3182bd']);

  var ax = d3.svg.axis().scale(sxLabel).orient('bottom'); 
  var ay = d3.svg.axis().scale(syLabel).orient('left');


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
    .attr('fill', function(d){
      if(d.value==1){//d.rowIndex == d.colIndex){
        return 'black';
      }else{
        return sc(d.value);
      }
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

    d3.select(this)
    .attr('stroke', 'yellow')
    .attr('stroke-width', 2);

    //hightlight chromosome name in the hovering row 
    svg.selectAll('.chrNameLabel.y')
    .filter( (_,i)=>i==d.rowIndex )
    .attr('fill', 'orange');

    svg.select('.chrNameLabel.x')
    .text(chrNames[d.colIndex])
    .attr('x', sxLabel(chrNames[d.colIndex]))
    .attr('y', side-margin+15);
  });

  boxes.on('mouseout',function(){
    d3.select(this)
      .attr('stroke-width', 0);
      
    svg.selectAll('.chrNameLabel.y')
      .attr('fill', 'black');

    svg.select('.chrNameLabel.x')
      .text('');
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





exports.initPlot = initPlot;
