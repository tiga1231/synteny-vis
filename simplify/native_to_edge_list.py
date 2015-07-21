import sys

def main(args):
    meta = next(sys.stdin)
    num_vertices, num_edges, _ = map(int, meta.split(' '))
    vertices = [None] # placeholder for infinite edge
    for i in range(num_vertices - 1):
        line = next(sys.stdin).strip()
        x, y = map(float, line.split(' '))
        vertices.append((x,y))
    next(sys.stdin)
    edges = []
    for i in range(num_edges):
        line = next(sys.stdin).strip()
        x = tuple(map(int, line.split(' ')))
        edges.append(x)
    next(sys.stdin)
    for i in range(num_edges):
        next(sys.stdin)

    edgeSet = set()
    for i in range(num_edges):
        line = next(sys.stdin).strip()
        x = tuple(line.split(' '))
        for m in range(3):
            c1, c2 = edges[i][(m+1)%3], edges[i][(m+2)%3]
            if c1 == 0 or c2 == 0: # infinite
                continue
            c1, c2 = max(c1, c2), min(c1, c2)
            edgeSet.add((c1, c2, x[m] == 'N'))

    print(num_vertices - 1, len(edgeSet))
    for vertex in vertices[1:]:
        print(*vertex)
    for edge in edgeSet:
        print(edge[0]-1, edge[1]-1, 'virtual' if edge[2] else 'real')
        
if __name__ == '__main__':
    exit(main(sys.argv))

