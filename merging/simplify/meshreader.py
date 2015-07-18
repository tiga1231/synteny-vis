from point import Point
from edge import Edge


def stream_to_edge_list(input_stream):
    meta = next(input_stream)
    number_of_vertices, number_of_edges = map(int, meta.split())
    vertices = []
    edges = []
    for i in range(number_of_vertices):
        vertices.append(parse_vertex(next(input_stream)))
    map_duplicates(vertices)
    for i in range(number_of_edges):
        a, b, virtual = parse_edge(next(input_stream))
        av = vertices[a]
        bv = vertices[b]
        if av == bv:
            continue
        skip = False
        for e in edges:
            if (e.p1() == av and e.p2() == bv) or (e.p1() == bv and e.p2() == av):
                skip = True
        if skip: continue
        alen = len(av.edges())
        blen = len(bv.edges())
        edges.append(Edge(av, bv, virtual))
        assert alen + 1 == len(av.edges())
        assert blen + 1 == len(bv.edges())
    return edges


def parse_vertex(line):
    x, y = map(float, line.split(','))
    return Point(x, y)


def parse_edge(line):
    a, b, v = line.strip().split(',')
    return int(a), int(b), v == 'virtual'

def map_duplicates(vertices):
    for i in range(len(vertices)):
        for j in range(i+1, len(vertices)):
            if vertices[i] == vertices[j]:
                vertices[i] = vertices[j]
