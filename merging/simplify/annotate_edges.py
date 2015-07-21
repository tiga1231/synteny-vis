import sys
import bisect

def read_streamed_file():
    meta = next(sys.stdin).strip().split(' ')
    num_verts, num_edges = map(int, meta)
    vertices = []
    for i in range(num_verts):
        fields = next(sys.stdin).strip().split(' ')
        vertices.append((float(fields[0]), float(fields[1])))
    edges = []
    for i in range(num_edges):
        fields = next(sys.stdin).strip().split(' ')
        edges.append((int(fields[0]), int(fields[1]), fields[2]))
    return vertices, edges

def diff(a):
    return (a[2] - a[0], a[3] - a[1])

def parallel(a, b):
    adiff = diff(a)
    bdiff = diff(b)
    alen2 = sum(x**2 for x in adiff)
    blen2 = sum(x**2 for x in bdiff)
    dot = sum(x*y for x, y in zip(adiff, bdiff))
    return abs(dot**2 - alen2 * blen2) < .001

def inside(a, b):
    adiff = (0,0) + diff(a)
    sep = a[:2] + b[2:]
    return parallel(adiff, sep)

def main(args):
    if len(args) < 2:
        print("need original ks csv data")
        return 1

    origName = sys.argv[1]

    original = []
    for line in open(origName):
        fields = line.strip().split(',')
        x1 = float(fields[4])
        x2 = float(fields[5])
        y1 = float(fields[16])
        y2 = float(fields[17])
        original.append((x1, y1, x2, y2))
    original.sort()

    verts, edges = read_streamed_file()    
    print(len(verts), len(edges))
    for v in verts:
        print(','.join([str(x) for x in v]))

    for edge in edges:
        if edge[2] == 'virtual':
            print(",".join([str(x) for x in edge] + ['-1']))
            continue
        thisOne = verts[edge[0]] + verts[edge[1]]

        lowX, highX = min(thisOne[0], thisOne[2]), max(thisOne[0], thisOne[2])
        lowMarker = (lowX, 0, 0, 0)
        hiMarker = (highX, 1e20, 1e20, 1e20)
        low = bisect.bisect_left(original, lowMarker)
        hi = bisect.bisect_right(original, hiMarker)

        index = -1
        for i in range(low, hi):
            orig = original[i]
            if parallel(thisOne, orig) and inside(orig, thisOne):
                if index != -1:
                    raise Exception("duplicate")
                index = i

        if index == -1:
            raise Exception('None')

        print(",".join([str(x) for x in edge] + [str(index)]))

#tests
e1 = (0, 0, 6, 6)
e2 = (1, 1, 3, 3)
assert parallel(e1, e2) and parallel(e2, e1)

e1 = (0, 0, 6, 6)
e2 = (1, 1, 2, 3)
assert not parallel(e1, e2) and not parallel(e2, e1)

e1 = (0, 0, 6, 6)
e2 = (1, 1, 3, 3)
assert parallel(e1, e2) and inside(e1, e2)

e1 = (0, 0, 6, 6)
e2 = (1, 2, 3, 4)
assert parallel(e1, e2) and not inside(e1, e2)

e1 = (0, 0, 0, 1)
e2 = (0, 0, 0, 2)
assert parallel(e1, e2) and parallel(e2, e1)

e1 = (0, 0, 0, 1)
e2 = (0, 0, 0, 2)
assert inside(e1, e2)

e1 = (0, 0, 1, 0)
e2 = (0, 0, 2, 0)
assert parallel(e1, e2) and parallel(e2, e1)

e1 = (0, 0, 1, 0)
e2 = (0, 0, 2, 0)
assert inside(e1, e2)

if __name__ == '__main__':
    exit(main(sys.argv))
