var sv = require('./synteny-vis');
var main = require('./main');

switch (window.location.hash) {
  case '#m':
  case '#maize':
    main.loadksData('./data/6807_8082.CDS-CDS.dcmegablast.tdd10.cs0.filtered.dag.all.go_D40_g20_A10.aligncoords.gcoords.ks', '6807', '8082', sv.controller);
    break;

  case '#e':
  case '#ecoli':
    main.loadksData('./data/4241_4242.CDS-CDS.last.tdd10.cs0.filtered.dag.all.go_D20_g10_A5.aligncoords.gcoords.ks', '4241', '4242', sv.controller);
    break;

  case '#a':
  case '#arabidopsis':
    main.loadksData('./data/16911_3068.CDS-CDS.last.tdd10.cs0.filtered.dag.all.go_D20_g10_A5.aligncoords.gcoords.ks', '16911', '3068', sv.controller);
    break;

  default:
    window.location.hash = '#homo';
  case '#h':
  case '#homo':
    main.loadksData('./data/11691_25577.CDS-CDS.last.tdd10.cs0.filtered.dag.all.go_D20_g10_A5.aligncoords.gcoords.ks', '11691', '25577', sv.controller);
    break;
}


