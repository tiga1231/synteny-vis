var queue = require('queue-async');
var main = require('./main');
var _ = require('lodash');
var sv = require('synteny-vis');
var d3 = require('d3');

const files = [
	{
		hash: '#m',
		id_1: '6807',
		id_2: '8082',
		data_url: './data/6807_8082.json'
	},
	{
		hash: '#e',
		id_1: '4241',
		id_2: '4242',
		data_url: './data/4241_4242.json'
	},
	{
		hash: '#a',
		id_1: '16911',
		id_2: '3068',
		data_url: './data/16911_3068.json'
	},
	{
		hash: '', // default -- matches all window.location.hash, even empty
		id_1: '11691',
		id_2: '25577',
		data_url: './data/11691_25577.json'
	}
];

const info = _.find(files, ({hash}) => window.location.hash.indexOf(hash) > -1);

queue()
	.defer(d3.json, 'lengths/' + info.id_1 + '.json')
	.defer(d3.json, 'lengths/' + info.id_2 + '.json')
	.await((err, genome_x, genome_y) => {
		if (err) {
			console.log(err);
			return;
		}
	
		main.makeSyntenyDotPlot({
			element_id: 'myDiv',
			data_url: info.data_url,
			genome_x,
			genome_y
		});
	});

window.refreshAutoScale = sv.refreshAutoScale;
window.refreshAutoDots = sv.refreshAutoDots;
