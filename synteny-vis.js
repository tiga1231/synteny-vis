'use strict';

var COLOR_RANGES = {
  rg: ['red', 'green'],
  rg_quantized: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
  rainbow: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
  rainbow_quantized: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange']
};

function getComputedAttr(element, attr) {
  var computed = window.getComputedStyle(element)[attr];
  return parseInt(computed, 10);
}

function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}

function refreshAutoScale() {
  var radio = document.getElementById('color-options');
  var auto = _.find(radio.children, {
    value: 'auto'
  });
  auto.checked = false;
  auto.click();
}

var refreshAutoDots;

function getPersistence() {
  return Number(document.getElementById('persistence').value);
}

function controller(dataObj) {

  refreshAutoDots = function() {
    _.each(histograms, function(h) {
      h.refreshAutoScale();
    });
  }

  var syntenyPlot;
  /* zoom/pan switching */
  d3.selectAll("#mouse-options input[name=mouse-options]")
    .on("change", function() {
      syntenyPlot.setNavMode(this.value);
    });

  /* summary mode switching */
  d3.selectAll("#summary-options input[name=summary-options]")
    .on("change", function() {
      dataObj.setOrder('logks', this.value === 'minimum');
    });

  /* Plot variable switching */
  d3.selectAll("#plot-var-options input[name=plot-var-options]")
    .on("change", function() {
      histograms[activeField].setColorScale(steelBlueCS);
      activeField = this.value;
      syntenyPlot.setField(activeField);
      var newCS;
      if (activeCS === 'auto') {
        newCS = histograms[activeField].getAutoScale();
      } else {
        newCS = colorScales[activeField][activeCS];
      }
      syntenyPlot.setColorScale(newCS);
      histograms[activeField].setColorScale(newCS);
    });

  /* color mode switching */
  var activeField = 'logks';
  var activeCS = 'rg';
  d3.selectAll("#color-options input[name=color-options]")
    .on("change", function() {
      var newCS;
      if (this.value === 'auto') {
        newCS = histograms[activeField].getAutoScale();
      } else {
        newCS = colorScales[activeField][this.value];
      }
      console.log(newCS);
      histograms[activeField].setColorScale(newCS);
      syntenyPlot.setColorScale(newCS);
      activeCS = this.value;
    });

  var fields = ['logks', 'logkn', 'logkskn'];
  var colorScales = _.chain(fields)
    .map(function(field) {
      return [field, d3.extent(_.pluck(dataObj.currentData().raw, field))];
    })
    .object()
    .mapValues(function(extent) {
      var max = extent[1];
      var min = extent[0];
      var range = max - min;

      return _.mapValues(COLOR_RANGES, function(colorRange, colorScaleName) {
        var step = range / (colorRange.length - 1);
        // Extra .5 * step is to avoid missing a value because of floating point precision
        var domain = _.range(min, max + 0.5 * step, step);

        var scale = colorScaleName.indexOf('quantized') > -1 ? d3.scale.quantize() : d3.scale.linear();
        return scale.domain(domain).range(colorRange);
      });
    })
    .value();


  var steelBlueCS = _.constant('steelblue');
  var initialColorScale = colorScales[activeField]['rg'];

  syntenyPlot = synteny('#dotplot', dataObj, 'logks', initialColorScale);
  var histograms = {
    'logks': histogram('#plot', dataObj, 'logks', initialColorScale),
    'logkn': histogram('#plot2', dataObj, 'logkn', steelBlueCS),
    'logkskn': histogram('#plot3', dataObj, 'logkskn', steelBlueCS)
  };
  dataObj.notifyListeners('initial');
}

