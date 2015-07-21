import sys

def main(args):
    seen = set()
    for line in sys.stdin:
        fields = line.strip().split(',')
        rep = tuple(fields[4:6]) + tuple(fields[16:18])
        if rep in seen:
            continue
        seen.add(rep)
        print(line, end='')


if __name__ == '__main__':
    exit(main(sys.argv))
