import sys
import json

import readks


def main(args):
    if len(args) < 3:
        print('Provide a lengths file')
        return 1

    x_lengths = open(args[1]).read()
    y_lengths = open(args[2]).read()
    x_offsets = convert_length_file_to_offsets(x_lengths)
    y_offsets = convert_length_file_to_offsets(y_lengths)

    data = readks.convert_ks_file_line_list_to_objects(sys.stdin)
    extract_points_and_constraints(x_offsets, y_offsets, data)

    return 0


def convert_length_file_to_offsets(lines):
    length_object = json.loads(lines)
    length_object = convert_lengths_to_numbers(length_object)
    offsets = convert_lengths_to_cumulative_offsets(length_object)
    return offsets


def convert_lengths_to_numbers(length_data):
    for chromosome in length_data['lengths']:
        chromosome['length'] = int(chromosome['length'])
    return length_data


def convert_lengths_to_cumulative_offsets(lengths):
    length_list = [x for x in lengths['lengths']]
    length_list.sort(key=lambda x: int(x['length']), reverse=True)

    offset_map = {}
    for upper_bound, chromosome, in enumerate(length_list):
        offset = sum(chromosome['length'] for chromosome in length_list[:upper_bound])
        offset_map[chromosome['name']] = offset
    return offset_map


def extract_points_and_constraints(x_offsets, y_offsets, data):
    for chromosome in data:
        points = []
        constraints = []

        x_chromosome_id = chromosome['meta']['aID_c']
        x_chromosome_name = ''.join(x_chromosome_id.split('_')[1:])
        y_chromosome_id = chromosome['meta']['bID_c']
        y_chromosome_name = ''.join(y_chromosome_id.split('_')[1:])

        x_offset = x_offsets[x_chromosome_name]
        y_offset = y_offsets[y_chromosome_name]

        for line in chromosome['data']:
            x1 = int(line['start1']) + x_offset
            y1 = int(line['start2']) + y_offset
            x2 = int(line['stop1']) + x_offset
            y2 = int(line['stop2']) + y_offset
            p1 = (x1, y1)
            p2 = (x2, y2)
            constraints.append((len(points), len(points) + 1))
            points.append(p1)
            points.append(p2)

        write_to_file(points, constraints, x_chromosome_id, y_chromosome_id)


def write_to_file(points, constraints, x_chromosome_name, y_chromosome_name):
    file_name = '%s.%s.pc' % (x_chromosome_name, y_chromosome_name)
    outfile = open(file_name, 'a')

    print_point_header(outfile)
    print_pairs(points, outfile)
    print_constraint_header(outfile)
    print_pairs(constraints, outfile)
    outfile.close()


def print_pairs(pairs, outfile):
    for pair in pairs:
        print('%d,%d' % pair, file=outfile)


def print_point_header(outfile):
    print('POINTS', file=outfile)


def print_constraint_header(outfile):
    print('CONSTRAINTS', file=outfile)


if __name__ == '__main__':
    exit(main(sys.argv))
