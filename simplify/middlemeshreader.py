from point import Point
from edge import Edge
import sys

__author__ = 'seanastephens'

def debug(*args):
    sys.stderr.write(" ".join(str(x) for x in args) + '\n')
def read(input):
    meta = next(input)
    num_vertices, num_edges = map(int, meta.split(' '))

    vertices = []
    for i in range(num_vertices):
        line = next(input).strip()
        x, y = map(float, line.split(' '))
        vertices.append(Point(x, y))

    realEdges = []
    for i in range(num_edges):
        fields = next(input).strip().split(' ')
        v1, v2 = int(fields[0]), int(fields[1])
        virtual = fields[2] == 'virtual'
        dataLink = {int(fields[3])} if fields[3] != '-1' else set()
        v1, v2 = min(v1, v2), max(v1, v2)
        realEdges.append(Edge(vertices[v1], vertices[v2], virtual, safe=False, extra_data=dataLink))

    for vertex in vertices:
        vertex.fix_edges()

    return realEdges
