function plotLines(lines, extents, level) {

  var xScale = d3.scale.linear()
    .domain(extents.x)
    .range([BUFFER, WIDTH - BUFFER]);
  var yScale = d3.scale.linear()
    .domain(extents.y)
    .range([HEIGHT - BUFFER, BUFFER]);

  var unitsPerPixel = (extents.x[1] - extents.x[0]) / (WIDTH - 2 * BUFFER);

  var thresholdFraction = level / unitsPerPixel;

  var canvas = d3.select("body").append("canvas")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .call(d3.behavior.zoom()
      .x(xScale).y(yScale)
      .scaleExtent([1, 10000]).on("zoom", zoom))
    .node().getContext("2d");

  draw();

  function zoom() {
    canvas.clearRect(0, 0, WIDTH, HEIGHT);
    draw();
  }

  function draw() {
    for (var i = 0; i < lines.length; i++) {
      d = lines[i];
      x1 = xScale(d.x1);
      y1 = yScale(d.y1);
      x2 = xScale(d.x2);
      y2 = yScale(d.y2);
      canvas.beginPath();
      canvas.strokeStyle = 'red';
      canvas.lineWidth = LINE_WIDTH;
      canvas.lineCap = 'round';
      canvas.moveTo(x1, y1);
      canvas.lineTo(x2, y2);
      canvas.stroke();
    }
    canvas.fill();
  }

  images.push({
    'threshold': level,
    'data': canvas.getImageData(0, 0, WIDTH, HEIGHT).data,
    'num_lines': lines.length
  });
  if (images.length == NUM_LEVELS) {
    doComparison();
  }
}

function doComparison() {
  images = _.sortBy(images, 'threshold');
  var pad = '            ';

  for (var i = 0; i < images.length; i++) {
    var value = imageNorm(images[0].data, images[i].data);

    var start = (pad + images[i].threshold).slice(-12);
    var mid = (pad + images[i].num_lines).slice(-12);
    var end = (pad + value).slice(-12);
    console.log('0 vs. ' + start + mid + end);
  }
}

function imageNorm(a, b) {
  var val = 0;
  for (var i = 0; i < WIDTH * HEIGHT * 4; i++) {
    val += (a[i] - b[i]) * (a[i] - b[i]);
  }
  return val;
}

