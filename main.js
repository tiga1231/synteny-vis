d3.text('data/11691_25577.CDS-CDS.last.tdd10.cs0.filtered.dag.all.go_D20_g10_A5.aligncoords.gcoords.ks', function(err, text) {

  /* 
   * .ks files are delimited with a combination of tabs and double bars.
   * We convert that to just commas.
   */
  var lines = text.replace(/\|\|/g, ',')
    .replace(/\t/g, ',')
    .replace(' ', '')
    .split('\n');

  var data = _.chain(lines)
    .compact()
    .filter(function(line) {
      return line[0] !== '#'
    })
    .map(ksLineToSyntenyDot)
    .value();

  var q = queue();
  q = q.defer(d3.json, '../lengths/11691.json');
  q = q.defer(d3.json, '../lengths/25577.json');
  q.await(function(err, a, b) {
    if (err) {
      console.log(err);
      return;
    }
    preprocess(data, a, b);
  });
});

function ksLineToSyntenyDot(line) {
  var fields = line.split(',');
  var dot = {};
  dot.ks = Number(fields[0]);
  dot.kn = Number(fields[1]);
  dot.x_chromosome_id = fields[3];
  dot.y_chromosome_id = fields[15];
  dot.nt = {};
  dot.ge = {};
  dot.ge.x_relative_offset = fields[10];
  dot.ge.y_relative_offset = fields[22];
  dot.nt.x_relative_offset = Math.round((Number(fields[4]) + Number(fields[5])) / 2);
  dot.nt.y_relative_offset = Math.round((Number(fields[16]) + Number(fields[17])) / 2);
  return dot;
}

