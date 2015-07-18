function plotLines(lines, thresholdIndex) {
  var numberOfLines = _.filter(lines, function(x) {
    return x.type == 'real'
  }).length;
  var cleanLines = convertStringFieldsToNumbers(lines);
  var extents = getExtents(cleanLines);

  var xScale = d3.scale.linear()
    .domain(extents.x)
    .range([BUFFER, WIDTH - BUFFER]);
  var yScale = d3.scale.linear()
    .domain(extents.y)
    .range([HEIGHT - BUFFER, BUFFER]);

  var unitsPerPixel = (extents.x[1] - extents.x[0]) / (WIDTH - 2 * BUFFER);

  var thresholdFraction = levels[thresholdIndex] / unitsPerPixel;

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
    for (var i = 0; i < cleanLines.length; i++) {
      d = cleanLines[i];
      x1 = xScale(d.x1);
      y1 = yScale(d.y1);
      x2 = xScale(d.x2);
      y2 = yScale(d.y2);
      canvas.beginPath();
      canvas.strokeStyle = 'red';
      canvas.lineWidth = 3;
      canvas.lineCap = 'round';
      canvas.moveTo(x1, y1);
      canvas.lineTo(x2, y2);
      canvas.stroke();
    }
    canvas.fill();
  }

  images.push([thresholdIndex, canvas.getImageData(0, 0, WIDTH, HEIGHT)]);
  num_lines.push([thresholdIndex, cleanLines.length]);
  if (images.length == levels.length) {
    doComparison();
  }
}

function doComparison() {
  images = _.chain(images).sortBy('0').pluck('1').value();
  num_lines = _.chain(num_lines).sortBy('0').pluck('1').value();
  var ref = images[0];
  var pad = '            ';
  for (var i = 0; i < images.length; i++) {
    var value = imageNorm(ref.data, images[i].data);
    var start = (pad + levels[i]).slice(-12);
    var mid = (pad + num_lines[i]).slice(-12);
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

function convertStringFieldsToNumbers(lines) {
  return _.map(lines, function(line) {
    var converted = {
      x1: Number(line.x1),
      x2: Number(line.x2),
      y1: Number(line.y1),
      y2: Number(line.y2),
      type: line.type
    };
    return converted;
  });
}

function getExtents(lines) {
  var xMax = d3.max(lines, function(line) {
    return Math.max(line.x1, line.x2);
  });
  var yMax = d3.max(lines, function(line) {
    return Math.max(line.y1, line.y2);
  });
  var xMin = d3.min(lines, function(line) {
    return Math.min(line.x1, line.x2);
  });
  var yMin = d3.min(lines, function(line) {
    return Math.min(line.y1, line.y2);
  });
  return {
    x: [xMin, xMax],
    y: [yMin, yMax]
  };
}

