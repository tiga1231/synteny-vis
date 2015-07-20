import sys
import itertools

def main(args):

    def chrom_name_tuple(line):
        fields = line.strip().split(',')
        return fields[3] + '.' + fields[15]

    lines = list(sys.stdin)
    lines.sort(key=chrom_name_tuple)

    for key, group in itertools.groupby(lines, key=chrom_name_tuple):
        with open(key + '.csv.group', 'w') as f:
            for line in group:
                f.write(line)

if __name__ == '__main__':
    exit(main(sys.argv))
