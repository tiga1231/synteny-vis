import itertools


def convert_ks_file_line_list_to_objects(lines):
    rest = drop(3, lines)  # first 3 lines describe format
    head_and_data = pair_header_with_data(rest)
    return [parse_header_data_pairs(pair) for pair in head_and_data]


def drop(n, it):
    return itertools.islice(it, n, None)


def pair_header_with_data(it):
    sets = itertools.groupby(it, lambda x: x[0] == '#')
    headers_and_data = [list(lines) for _, lines in sets]
    return zip(*[iter(headers_and_data)] * 2)


def parse_header_data_pairs(pair):
    headers, data = pair
    header1, header2 = headers
    header1 = convert_multi_delimiter_to_list(header1)
    header2 = convert_multi_delimiter_to_list(header2)
    data_lines = [convert_multi_delimiter_to_list(line) for line in data]
    return convert_line_to_labeled_object(header1, header2, data_lines)


def convert_multi_delimiter_to_list(line):
    delimiters_to_remove = ['||', '  ']
    delimiter_target = '\t'
    for delimiter in delimiters_to_remove:
        line = line.replace(delimiter, delimiter_target)
    return [x.strip() for x in line.split('\t')]


META_DATA_COLUMN_NAMES = [
    'id',
    '_',
    'aID_c',
    'bID_c',
    'direction',
    'count',
    'meanKs',
    'meanKn'
]


def convert_line_to_labeled_object(meta_data, data_header, data):
    meta_data[0] = remove_leading_hash(meta_data[0])
    data_header[0] = remove_leading_hash(data_header[0])

    # There is a mis match between the number of fields in the data header 
    # and the number of columns in the data.
    # Not sure what is going on, but for now we throw out the extra header 
    # field and the extra data columns. They aren't important, I guess.

    data_header.pop(26)  # remove GEVO_LINK header field
    for line in data:
        line.pop(22)  # Mystery column 2
        line.pop(10)  # Mystery column 1

    meta = make_labeled_meta_data(meta_data)
    data = [make_labeled_data(data_header, line) for line in data]
    return {'meta': meta, 'data': data}


def remove_leading_hash(text):
    if text[0] == '#':
        text = text[1:]
    return text


def make_labeled_meta_data(meta_data):
    return {name: value for name, value in zip(META_DATA_COLUMN_NAMES, meta_data)}


def make_labeled_data(data_header, line):
    return {key: value for key, value in zip(data_header, line)}

# test input - just a hard coded subset of the ecoli file
test_ks = [
    '#This file contains synonymous rate values in the first two columns:',
    '#  Mean Ks:  NA\tMean Kn: NA',

    '#Ks\tKn\ta<db_genome_id>_<chr>\tchr1||start1||stop1||name1||strand1||' +
    'type1||db_feature_id1||percent_id1\tstart1\tstop1\tb<db_genome_id>_<c' +
    'hr>\tchr2||start2||stop2||name2||strand2||type2||db_feature_id2||perc' +
    'ent_id2\tstart2\tstop2\teval\tblock_score\tGEVO_link',

    '#1\t138674.0\ta4241_1\tb4242_1\tf\t2787  Mean Ks:  0.0675\tMean Kn: 0.0086',

    '#Ks\tKn\ta<db_genome_id>_<chr>\tchr1||start1||stop1||name1||strand1' +
    '||type1||db_feature_id1||percent_id1\tstart1\tstop1\tb<db_genome_id>_<chr>' +
    '\tchr2||start2||stop2||name2||strand2||type2||db_feature_id2||percent_id2' +
    '\tstart2\tstop2\teval\tblock_score\tGEVO_link',

    '0.0093\t0.0000\ta4241_1\t1||1397989||1398285||ECDH10B_1366||-1||CDS' +
    '||24909233||1293||99.7\t1398285\t1397989\tb4242_1\t1||1308593||1308889' +
    '||NP_415767.2||-1||CDS||24924643||1206||99.7\t1308889\t1308593\t' +
    '7.400000e-169\t50',

    '0.0000\t0.0000\ta4241_1\t1||1398509||1399228||ECDH10B_1367||1||CDS' +
    '||24909270||1294||100.0\t1398509\t1399228\tb4242_1\t1||1309113||1309832' +
    '||NP_415768.1||1||CDS||24924685||1207||100.0\t1309113\t1309832\t' +
    '1.000000e-250\t100',

    '#1\t138674.0\ta4241_1\tb4242_1\tf\t2787  Mean Ks:  0.0675\tMean Kn: 0.0086',

    '#Ks\tKn\ta<db_genome_id>_<chr>\tchr1||start1||stop1||name1||strand1' +
    '||type1||db_feature_id1||percent_id1\tstart1\tstop1\tb<db_genome_id>_<chr>' +
    '\tchr2||start2||stop2||name2||strand2||type2||db_feature_id2||percent_id2' +
    '\tstart2\tstop2\teval\tblock_score\tGEVO_link',

    '0.0093\t0.0000\ta4241_1\t1||1397989||1398285||ECDH10B_1366||-1||CDS' +
    '||24909233||1293||99.7\t1398285\t1397989\tb4242_1\t1||1308593||1308889' +
    '||NP_415767.2||-1||CDS||24924643||1206||99.7\t1308889\t1308593\t' +
    '7.400000e-169\t50',

    '0.0000\t0.0000\ta4241_1\t1||1398509||1399228||ECDH10B_1367||1||CDS' +
    '||24909270||1294||100.0\t1398509\t1399228\tb4242_1\t1||1309113||1309832' +
    '||NP_415768.1||1||CDS||24924685||1207||100.0\t1309113\t1309832\t' +
    '1.000000e-250\t100'
]

# Manually extracted list of fields that should be extracted
data_fields = [
    'Ks', 'Kn', 'a<db_genome_id>_<chr>', 'chr1', 'start1', 'stop1', 'name1',
    'strand1', 'type1', 'db_feature_id1', 'percent_id1', 'start1', 'stop1',
    'b<db_genome_id>_<chr>', 'chr2', 'start2', 'stop2', 'name2', 'strand2',
    'type2', 'db_feature_id2', 'percent_id2', 'start2', 'stop2', 'eval',
    'block_score'
]

# tests
dicts = convert_ks_file_line_list_to_objects(test_ks)
assert len(dicts) == 2, "didn't find all chromosomes in data"
for chromosome in dicts:
    assert 'data' in chromosome, "data field missing in chromosome: " + str(chromosome)
    assert 'meta' in chromosome, "meta field missing in chromosome: " + str(chromosome)

    chromosome_meta = chromosome['meta']
    for field in META_DATA_COLUMN_NAMES:
        assert field in chromosome_meta, field + " missing in meta: " + chromosome_meta

    chromosome_data = chromosome['data']
    assert len(chromosome_data) == 2, "didn't find all lines for chromosome: " + str(chromosome)
    for match in chromosome_data:
        for field in data_fields:
            assert field in match, field + " missing in data: " + chromosome_data
