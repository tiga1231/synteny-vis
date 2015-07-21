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

def len2(a):
    return sum(x**2 for x in a)

def contained(a, b):
    e = 1
    axmin, axmax = min(a[0], a[2]), max(a[0], a[2])
    aymin, aymax = min(a[1], a[3]), max(a[1], a[3])
    bxmin, bxmax = min(b[0], b[2]), max(b[0], b[2])
    bymin, bymax = min(b[1], b[3]), max(b[1], b[3])
    return axmin - e <= bxmin and bxmax <= axmax + e \
            and aymin - e <= bymin and bymax <= aymax + e

def min_ep_dist2(a, b):
    a1, a2 = a[:2], a[2:]
    b1, b2 = b[:2], b[2:]
    pairs = [(x, y) for x in [a1, a2] for y in [b1, b2]]
    return min(len2(diff(x + y)) for x, y in pairs)

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
        print(' '.join([str(x) for x in v]))

    for edge in edges:
        if edge[2] == 'virtual':
            print(" ".join([str(x) for x in edge] + ['-1']))
            continue
        thisOne = verts[edge[0]] + verts[edge[1]]

        lowX, highX = min(thisOne[0], thisOne[2]), max(thisOne[0], thisOne[2])
        lowMarker = (lowX, 0, 0, 0)
        hiMarker = (highX, 1e20, 1e20, 1e20)
        low = bisect.bisect_left(original, lowMarker)
        hi = bisect.bisect_right(original, hiMarker)

        low = max(low - 10, 0)
        hi = min(hi + 10, len(original))

        index = -1
        for i in range(low, hi):
            orig = original[i]

            if contained(orig, thisOne):
                if index != -1:
                    if min_ep_dist2(orig, thisOne) < \
                            min_ep_dist2(original[index], thisOne):
                        index = i
                else:
                    index = i

        if index == -1:
            print(thisOne)
            print(original[low:hi])
            raise Exception('None')

        print(" ".join([str(x) for x in edge] + [str(index)]))


if __name__ == '__main__':
    exit(main(sys.argv))
