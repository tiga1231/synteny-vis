import sys

def main(args):
    f = open('dups.txt', 'w')
    seen = {}
    for i, line in enumerate(sys.stdin):
        fields = line.strip().split(',')
        rep = tuple(fields[4:6]) + tuple(fields[16:18])
        if rep in seen.keys():
            f.write('Line ' + str(i) + ' matched line ' + str(seen[rep][0]) + '\n')
            if seen[rep][1] == line:
                f.write('It was an exact match.\n');
            else:
                x = line.strip().split(',');
                y = seen[rep][1].strip().split(',');
                diffs = {i for i in range(len(x)) if x[i] != y[i]}
                f.write('They differed only in fields: ' + ','.join([str(i) for i in diffs]) + '\n')
            f.write(line)
            f.write(seen[rep][1])
            continue
        seen[rep] = (i, line)
        print(line, end='')


if __name__ == '__main__':
    exit(main(sys.argv))
