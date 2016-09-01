'use strict';

exports.ROUNDING_FACTOR = 10;

exports.RUN_BENCHMARKS = false;

exports.SHOW_MAXIMA_AND_MINIMA = false;

exports.AUTO_SCALE_VALLEY_FILL = '#D0D0D0';

exports.SYNTENY_MARGIN = 50;
exports.CIRCLE_RADIUS = 3;
exports.UNSELECTED_DOT_FILL = '#D0D0D0';
exports.NUM_COLOR_SCALE_INTERPOLATION_SAMPLES = 100;
exports.DOTPLOT_COLOR_TRANS_LEN = 500;
exports.MAXIMIZE_WIDTH = true;
exports.MIN_TEXT_GAP = 12;
exports.GEVO_CLICK_PROXIMITY_THRESHOLD_PIXELS = 50;

exports.HISTOGRAM_MARGIN = 50;
exports.HISTOGRAM_Y_SCALE_TRANS_LEN = 750;
exports.NUM_HISTOGRAM_TICKS = 75;
exports.UNSELECTED_BAR_FILL = '#D0D0D0';

exports.COLOR_RANGES = {
  rg: {
    range: ['red', 'green'],
    quantized: false
  },
  rg_quantized: { /* From colorbrewer */
    range: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf',
      '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
    quantized: true
  },
  rainbow: {
    range: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
    quantized: false
  },
  rainbow_quantized: {
    range: ['blue', 'magenta', 'aqua', 'lime', 'red', 'orange'],
    quantized: true
  },
  unselected: {
    range: ['steelblue', 'steelblue'], /* d3.scale needs at least two points */
    quantized: false
  }
};
