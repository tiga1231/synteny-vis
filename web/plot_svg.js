var containers = [];

function plotLines(lines, extents, level, div) {

  var xScale = d3.scale.linear()
    .domain(extents.x)
    .range([BUFFER, WIDTH - BUFFER]);
  var yScale = d3.scale.linear()
    .domain(extents.y)
    .range([HEIGHT - BUFFER, BUFFER]);

  var unitsPerPixel = (extents.x[1] - extents.x[0]) / (WIDTH - 2 * BUFFER);
  var thresholdFraction = level / unitsPerPixel;

  var zoom = d3.behavior.zoom()
    .x(xScale).y(yScale).scaleExtent([1, 10000])
    .on('zoom', zoomed);

  var svg = div.append('svg')
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .call(zoom);

  var container = svg.append('g');

  container.selectAll('line')
    .data(lines)
    .enter()
    .append('line')
    .attr('x1', function(line) {
      return xScale(line.x1);
    })
    .attr('y1', function(line) {
      return yScale(line.y1);
    })
    .attr('x2', function(line) {
      return xScale(line.x2);
    })
    .attr('y2', function(line) {
      return yScale(line.y2);
    })
    .attr('class', function(line) {
      return line.type;
    })
    .attr('stroke', function(line) {
      return colorScale(line[FIELD]);
    })
    .attr('stroke-width', LINE_WIDTH);

  var message = lines.length + ' lines ';
  message += '(' + thresholdFraction + ')';
  svg.append('text')
    .attr('transform', 'translate(5,20)')
    .text(message);

  function zoomed() {
    _.each(containers, function(cont) {
      cont.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
      cont.selectAll('.virtual').style('stroke-width', LINE_WIDTH / d3.event.scale);
      cont.selectAll('.real').style('stroke-width', LINE_WIDTH / d3.event.scale);
    })
  }

  containers.push(container);
}

