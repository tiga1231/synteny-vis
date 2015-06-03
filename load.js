var q = queue();

switch (window.location.hash) {
  case '#homo_chimp':
  case '#h':
    q = q.defer(d3.json, 'data/homo_chimp.json')
      .defer(d3.json, 'lengths/11691.json')
      .defer(d3.json, 'lengths/25577.json');
    break;
  case '#ecoli':
  case '#e':
    q = q.defer(d3.json, 'data/ecoli.json')
      .defer(d3.json, 'lengths/4241.json')
      .defer(d3.json, 'lengths/4242.json');
    break;
  case '#arabidopsis':
  case '#a':
    q = q.defer(d3.json, 'data/arabidopsis.json')
      .defer(d3.json, 'lengths/16911.json')
      .defer(d3.json, 'lengths/3068.json');
    break;
  case '#maize_sorghum':
  case '#m':
    q = q.defer(d3.json, 'data/maize_sorghum.json')
      .defer(d3.json, 'lengths/6807.json')
      .defer(d3.json, 'lengths/8082.json');
    break;
  default:
    alert("Don't know what '" + window.location.hash + "' is. Loading homo_chimp.json");
    q = q.defer(d3.json, 'data/homo_chimp.json')
      .defer(d3.json, 'lengths/11691.json')
      .defer(d3.json, 'lengths/25577.json');
}

q.await(synteny);

