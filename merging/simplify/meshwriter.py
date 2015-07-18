import sys


def write_mesh_to_stream_as_points_and_edges(edge_list, output=sys.stdout, show_virtual=True):
    num_edges = len(edge_list)
    vertices = {p for edge in edge_list for p in [edge.p1(), edge.p2()]}
    vertex_list = list(vertices)
    vertex_map = {v: i for i, v in enumerate(vertex_list)}
    num_vertices = len(vertices)
    output.write('%d %d' % (num_vertices, num_edges))
    for vertex in vertices:
        output.write('\n')
        output.write('%f,%f' % (vertex.x(), vertex.y()))
    for edge in edge_list:
        if edge.virtual() and not show_virtual:
            continue
        output.write('\n')
        p1, p2 = edge.p1(), edge.p2()
        i1 = vertex_map[p1]
        i2 = vertex_map[p2]
        kind = 'virtual' if edge.virtual() else 'real'
        output.write('%d,%d,%s' % (i1, i2, kind))
    output.write('\n')
