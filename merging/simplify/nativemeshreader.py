from point import Point
from edge import Edge

__author__ = 'seanastephens'


def read(input):
    meta = next(input)
    num_vertices, num_edges, _ = map(int, meta.split(' '))
    vertices = [None]
    for i in range(num_vertices - 1):
        line = next(input).strip()
        x, y = map(float, line.split(' '))
        vertices.append(Point(x, y))
    next(input)
    edges = []
    for i in range(num_edges):
        line = next(input).strip()
        x = tuple(map(int, line.split(' ')))
        edges.append(x)
    next(input)
    for i in range(num_edges):
        next(input)
    edgeSet = set()
    for i in range(num_edges):
        line = next(input).strip()
        x = tuple(line.split(' '))
        for m in range(3):
            c1, c2 = edges[i][(m+1)%3], edges[i][(m+2)%3]
            if c1 == 0 or c2 == 0: # infinite
                continue
            c1, c2 = max(c1, c2), min(c1, c2)
            edgeSet.add((c1, c2, x[m] == 'N'))
    realEdges = []
    for i, j, v in edgeSet:
        realEdges.append(Edge(vertices[i], vertices[j], v))
    return realEdges

