import sys
import bisect
from collections import defaultdict

def read_streamed_file():
    meta = next(sys.stdin).strip().split(' ')
    num_verts, num_edges = map(int, meta)
    vertices = []
    for i in range(num_verts):
        fields = next(sys.stdin).strip().split(',')
        vertices.append((float(fields[0]), float(fields[1])))
    edges = []
    for i in range(num_edges):
        fields = next(sys.stdin).strip().split(',')
        assert len(fields) >= 4
        edges.append((int(fields[0]), int(fields[1]), fields[2], \
                tuple([int(x) for x in fields[3:]])))
    return vertices, edges

def main(args):
    if len(args) < 2:
        print("need original ks csv data")
        return 1

    origName = sys.argv[1]
    original = [line.strip().split(',') for line in open(origName)]

    verts, edges = read_streamed_file()    
    print(len(verts), len(edges))
    for v in verts:
        print(','.join([str(x) for x in v]))

    vertex_to_edge_map = defaultdict(set)
    for edge in edges:
        vertex_to_edge_map[edge[0]].add(edge)        
        vertex_to_edge_map[edge[1]].add(edge)        

    polylines = []
    while len(vertex_to_edge_map.keys()) > 0:
        seed = list(vertex_to_edge_map.keys())[0]
        polyline = vertex_to_edge_map[seed]
        del vertex_to_edge_map[seed]
        while True:
            got_more = False
            for edge in polyline:
                if len(vertex_to_edge_map[edge[0]]) > 0:
                    polyline |= vertex_to_edge_map[edge[0]]
                    del vertex_to_edge_map[edge[0]]
                    got_more = True
                    break
                if len(vertex_to_edge_map[edge[1]]) > 0:
                    polyline |= vertex_to_edge_map[edge[1]]
                    del vertex_to_edge_map[edge[1]]
                    got_more = True
                    break
            if not got_more:
                break
        polylines.append(polyline)

    polylines = [p for p in polylines if len(p) > 0]

    for p in polylines:
        parts = set()
        for merged_edge in p:
            for original_edge in merged_edge[3]:
                parts.add(original_edge)
        data_to_merge = [original[i] for i in parts]

        def merge(data):
            def float_or_zero(x):
                try:
                    ret = float(x)
                except:
                    ret = 0
                return ret
            # only worry about ks, kn right now
            # Just taking an average, all segments weighted equally
            kss = [float_or_zero(x[0]) for x in data]
            kns = [float_or_zero(x[1]) for x in data]
            non_zero_kss = [x for x in kss if x > 0]
            non_zero_kns = [x for x in kns if x > 0]
            if len(non_zero_kns) > 0:
                min_kn, max_kn= min(non_zero_kns), max(non_zero_kns)
            else:
                min_kn, max_kn= 0, 0
            if len(non_zero_kss) > 0:
                min_ks, max_ks = min(non_zero_kss), max(non_zero_kss)
            else:
                min_ks, max_ks = 0, 0


            avg_ks = sum(kss)/len(kss)
            avg_kn = sum(kns)/len(kns)
            return "kn=%f,ks=%f,minkn=%f,maxkn=%f,minks=%f,maxks=%f" % (avg_kn, avg_ks, min_kn, max_kn, min_ks, max_ks)

        rep = merge(data_to_merge)

        for merged_edge in p:
            print(','.join([str(x) for x in merged_edge[:3]]) + ',' + rep)


if __name__ == '__main__':
    exit(main(sys.argv))
