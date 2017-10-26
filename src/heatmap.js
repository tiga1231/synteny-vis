import d3 from 'd3';

function plot(K, meta){
  var data = createData(K, meta); //TODO
  var svg = d3.select('#heatmap');  
  update(svg, data);
}


function createData(K ,meta){
  return [{},{}];
}

function update(svg, data){

  var width = svg.style('width');
  var height = svg.style('height');
  width = +width.substring(0,width.length-2);
  height = +height.substring(0,height.length-2);
  var margin = 0.1*Math.min(width, height);

  var sx = d3.scale.linear()
  .domain(d3.extent(data, d=>d.x))
  .range([margin, width-margin]);

  var sy = d3.scale.linear()
  .domain(d3.extent(data, d=>d.y))
  .range([height-margin, margin]);

  var sc = d3.scale.category10();

}

exports.plot = plot;
