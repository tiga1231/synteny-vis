import d3 from 'd3';
import queue from 'd3-queue';
import sv from './synteny-vis';
import { timeIt, zipObject } from './utils';
import { genCogeSequenceLink } from './coge-util';
import { inlineKSData,
         chromosomesToCumulativeBPCounts } from './chromosomeUtils.js';
import { createDataObj } from './dataObject';

exports.makeSyntenyDotPlot = function({
  data_url,
  spa_url,
  element_id,
  genome_x,
  genome_y,
  gen_coge_seq_link
}) {
  if (gen_coge_seq_link === undefined) {
    gen_coge_seq_link = genCogeSequenceLink;
  }

  var q = queue.queue();

  if (data_url === undefined) {
    console.error('Error - makeSyntenyDotPlot expects data_url parameter');
    return;
  }

  // default modes
  var mode = {
    withSpa: false,
    withKs: true,
    isCompressed: data_url.endsWith('compressed.ks')
  };
  
  if (mode.isCompressed){
    q = q.defer(d3.csv, data_url);
  }else{
    q = q.defer(d3.text, data_url);
  }

  if (spa_url !== undefined) {
    q = q.defer(d3.text, spa_url);
    mode.withSpa = true;
  }

  if (!data_url.endsWith('.ks')) {
    mode.withKs = false;
  }

  q.await(function(err, ks, spa) {
    if (err) {
      console.error(err);
      return;
    }

    // Dirty hacks to make files with no ks work:
    if (!mode.withKs) {
      const random = () => Math.random() * 3 + 2;
      ks = ks.split('\n')
        .map(x => x[0] === '#' ? x : `${random()},${random()},` + x)
        .join('\n');
    }

    var ksData;
    if(mode.isCompressed){
      ksData = compressedKsTextToObjects(ks);
    }else{
      ksData = ksTextToObjects(ks);
    }

    if (mode.withSpa) {
      genome_y = processSPAInformation({spa, genome_y, ksData});
    }

    const x_name = genome_x.name;
    const y_name = genome_y.name;
    var have_ks = mode.withKs;
    var have_spa = mode.withSpa;
    const meta = {
      genome_x,
      genome_y,
      x_name,
      y_name,
      have_ks,
      have_spa,
      gen_coge_seq_link
    };
    
    sv.controller(ksData, element_id, meta);
  });
};

// this function is a little ugly in that it mutates ksData
// but returns a new genome_y. I'm ok with that because ksData
// was created by makeSyntenyDotPlot, while genome_y was passed
// to makeSyntenyDotPlot, and so other upstream code might
// assume non-mutation.
//
// (FIXME: actually, processSPAInformation does mutate
// genome_y.chromosomes, so beware of that)
function processSPAInformation({
  spa,
  genome_y,
  ksData
}) {
  var newChromosomeOrder = {};
  spa = spa.split('\n');

  var genomeYById = {};
  genome_y.chromosomes.forEach(function(c) {
    genomeYById[c.name] = c;
  });
  var newOrder = 0;

  // loop over SPA information accumulating the chosen order and
  // recording chromosome flip information
  for (var i=1; i<spa.length; ++i) {
    var yChr;
    var line = spa[i].split('\t');
    if (line.length === 3) {
      // this is an actual SPA assignment
      yChr = line[1];
      var direction = line[2];

      if (genomeYById[yChr].order === undefined) {
        var slope = Number(direction);
        var intercept = slope === -1 ? genomeYById[yChr].length : 0;
        genomeYById[yChr].SPA_slope = slope;
        genomeYById[yChr].SPA_intercept = intercept;
        genomeYById[yChr].order = ++newOrder;
      }
    } else if (line.length === 2) {
      // this is an unmapped SPA assignment
      yChr = line[1];
      
      if (genomeYById[yChr].SPA_slope === undefined) {
        genomeYById[yChr].SPA_slope = 1;
        genomeYById[yChr].SPA_intercept = 0;
      }
    } // there are some empty lines in the files which we will skip
      // too
  }
  
  // update the metadata for unmatched chromosomes
  for (i=0; i<genome_y.chromosomes.length; ++i) {
    if (genome_y.chromosomes[i].order === undefined) {
      genome_y.chromosomes[i].order = ++newOrder;
    }
  }

  // use this information to remap the existing ksData
  ksData.forEach(function(d) {
    var g = genomeYById[d.y_chromosome_id];
    if (g === undefined) return;
    var intercept = g.SPA_intercept, slope = g.SPA_slope;
    d.y_relative_offset = d.y_relative_offset * slope + intercept;
  });
  
  return {
    name: '(SPA) ' + genome_y.name,
    id: genome_y.id,
    chromosomes: genome_y.chromosomes.sort(function(a, b) {
      return a.order - b.order;
    })
  };
}


function compressedKsTextToObjects(csvList){

  const dots = csvList
    .map(compressedKsLineToSyntenyDot)
    .filter(x => x);

  //if ks == 0, set to min ks
  var min_logks, min_logkn;
  dots.forEach(line => {
    if (isFinite(line.logks)) {
      if (min_logks === undefined || line.logks < min_logks) {
        min_logks = line.logks;
      }
    }
    if (isFinite(line.logkn)) {
      if (min_logkn === undefined || line.logkn < min_logkn) {
        min_logkn = line.logkn;
      }
    }
  });

  return dots.map(x => {
    x.logks = isFinite(x.logks) ? x.logks : min_logks;
    x.logkn = isFinite(x.logkn) ? x.logkn : min_logkn;
    x.logknks = x.logkn - x.logks;
    return x;
  });

}


const log10 = n => Math.log(n) / Math.log(10);
function compressedKsLineToSyntenyDot(csvRow){
  if(csvRow.ks === 'NA' || csvRow.ks === 'undef'){
    return undefined;
  }

  var logks = log10(Number(csvRow.ks));
  var logkn = log10(Number(csvRow.kn));
  var logkskn = logks - logkn;
  return {
    ks: csvRow.ks,
    kn: csvRow.kn,

    logks: logks,
    logkn: logkn,
    logknks: logkskn,
    x_chromosome_id: csvRow.chr1,
    y_chromosome_id: csvRow.chr2,
    x_relative_offset: Math.round(
                        (Number(csvRow.start1)+Number(csvRow.stop1)) / 2),
    y_relative_offset: Math.round(
                        (Number(csvRow.start2)+Number(csvRow.stop2)) / 2)
  };
}


function ksTextToObjects(text) {
  /* .ks files are delimited with a combination of tabs and double bars. */
  const csvLines = text
    .replace(/\|\|/g, ',')
    .replace(/\t/g, ',')
    .replace(' ', '')
    .split('\n');

  const dots = csvLines
    .filter(line => line && line[0] !== '#')
    .map(ksLineToSyntenyDot)
    .filter(x => x);

  var min_logks, min_logkn;
  // Don't use "Math.min(...dots)" here because that
  // causes a stack overflow on large datasets.
  dots.forEach(line => {
    if (isFinite(line.logks)) {
      if (min_logks === undefined || line.logks < min_logks) {
        min_logks = line.logks;
      }
    }
    if (isFinite(line.logkn)) {
      if (min_logkn === undefined || line.logkn < min_logkn) {
        min_logkn = line.logkn;
      }
    }
  });

  return dots.map(x => {
    x.logks = isFinite(x.logks) ? x.logks : min_logks;
    x.logkn = isFinite(x.logkn) ? x.logkn : min_logkn;
    x.logknks = x.logkn - x.logks;
    return x;
  });
}

function ksLineToSyntenyDot(line) {
  const fields = line.split(',');

  if(fields[0] === 'NA' || fields[1] === 'NA') {
    return undefined;
  }

  const ks = Number(fields[0]);
  const kn = Number(fields[1]);
  const log10 = n => Math.log(n) / Math.log(10);

  return {
    ks,
    logks: log10(ks),
    kn,
    logkn: log10(kn),
    logknks: log10(kn) - log10(ks),
    x_chromosome_id: fields[3],
    y_chromosome_id: fields[15],
    x_feature_id: fields[9],
    y_feature_id: fields[21],
    x_relative_offset: Math.round((Number(fields[4]) + Number(fields[5])) / 2),
    y_relative_offset: Math.round((Number(fields[16]) + Number(fields[17])) / 2)
  };
}




/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
