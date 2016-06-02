'use strict';

const jsdom = require('mocha-jsdom');
const sinon = require('sinon');
const queue = require('d3-queue');
const d3 = require('d3');
const sv = require('./synteny-vis');
const _ = require('lodash-fp');

const main = require('./main');

const ks = [
	'#This file contains synonymous rate values in the first two columns:',
	'#  Mean Ks:  NA	Mean Kn: NA',
	'#Ks	Kn	a<db_genome_id>_<chr>	chr1||start1||stop1||name1||strand1||type1||db_feature_id1||percent_id1	start1	stop1	b<db_genome_id>_<chr>	chr2||start2||stop2||name2||strand2||type2||db_feature_id2||percent_id2	start2	stop2	eval	block_score	GEVO_link',
	'#1	38642.0	a11691_1	b25577_1	f	774  Mean Ks:  1.3334	Mean Kn: 0.3247',
	'#Ks	Kn	a<db_genome_id>_<chr>	chr1||start1||stop1||name1||strand1||type1||db_feature_id1||percent_id1	start1	stop1	b<db_genome_id>_<chr>	chr2||start2||stop2||name2||strand2||type2||db_feature_id2||percent_id2	start2	stop2	eval	block_score	GEVO_link',
	'0.0121	0.0196	a11691_1	1||277846||279036||LOC100608313||1||CDS||85991876||3||98.6	277846	279036	b25577_1	1||138533||139309||ENSG00000237683.5||-1||CDS||647838015||3||98.6	139309	138533	1.000000e-250	50'
].join('\n');

const genome_x = {
	'name': 'x',
	'id': 11691,
	'chromosomes': [
		{ 'name': '1', 'length': 228333871, 'gene_count': 2319 }
	]
};

const genome_y = {
	'name': 'y', 
	'id':25577,
	'chromosomes': [
		{ 'name':'1', 'length': 249250621, 'gene_count': 5288 }
	]
};

describe('main', function() {

	jsdom();

	it('should include feature_ids', function() {

		sinon.stub(d3, 'text').returnsArg(0);

		sinon.stub(queue, 'queue', () => ({
			'defer': f => ({ 'await': cb => cb(null, f(ks)) })
		}));
		
		const sv_stub = sinon.stub(sv, 'controller');

		main.makeSyntenyDotPlot({
			genome_x, genome_y, data_url: 'not_used'	, element_id: 'not_used'
		});

		_(sv_stub.firstCall.args[0].currentData())
			.map(_.has(['x_feature_id', 'y_feature_id']))
			.all().should.be.true;
	});

});
