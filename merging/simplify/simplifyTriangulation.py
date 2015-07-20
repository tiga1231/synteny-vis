import sys
import time
import pprint

import heap
from meshwriter import write_mesh_to_stream_as_points_and_edges
from middlemeshreader import read

import point
PRINT_REAL_EDGES_ONLY = True
DEBUG = False
pp = pprint.PrettyPrinter()


def debug(*args):
    if DEBUG:
        print(*args)


def mesh_ok():
    for edge in edgeHeap.all_elements():
        inter = edge.p1().neighbors() & edge.p2().neighbors()
        for point in [edge.p1(), edge.p2()]:
            assert edge in point.edges(), "\n".join(['An edge', str(edge), 'Was not in the edge list of one of its endpoints', str(point), pp.pformat(point.edges())])
            for local_edge in point.edges():
                assert point in [local_edge.p1(), local_edge.p2()], point

def mesh_ok(): return

if sys.argv[1] != '--name':
    print("First argument should be --name FILENAME_BASE")
    sys.exit(1)

baseName = sys.argv[2]

THRESHOLDS = [int(x) for x in sys.argv[3:]]

start = time.clock()

#initial_edges = stream_to_edge_list(sys.stdin)
initial_edges = read(sys.stdin)
debug("edges loaded")

edgeHeap = heap.MinHeap()
for e in initial_edges:
    edgeHeap.insert(e)
mesh_ok()
debug('setup took', time.clock() - start)
start = time.clock()


def collapse_edge(edge_to_collapse):
    mesh_ok()
    new_point, removed_edges = edge_to_collapse.collapse()

    prev_num_edges = len(edgeHeap.all_elements())
    for edge in removed_edges:
        if edge.heap_index is not None:
            edgeHeap.remove_element(edge)

    mesh_ok()

    points_with_edges_to_notify = {new_point} | new_point.neighbors()
    for point in points_with_edges_to_notify:
        for edge in point.edges():
            if edge.heap_index is not None:
                edgeHeap.remove_element(edge)
                edgeHeap.insert(edge)

    mesh_ok()


def get_file_name(i):
    return baseName + '.' + str(i) + '.csv'


def print_current_edges(max_edge_length):
    outfile = open(get_file_name(max_edge_length), 'w')
    all_edges = edgeHeap.all_elements()
    write_mesh_to_stream_as_points_and_edges(all_edges, output=outfile, show_virtual=False)
    outfile.close()


def cull_short_edges(max_length):
    global num_removals
    while edgeHeap.size() > 0 and edgeHeap.find_min().len2() < max_length ** 2:
        for edge in edgeHeap.all_elements():
            assert edge.heap_index is not None
        if not edgeHeap.find_min().can_be_collapsed():
            return
        collapse_edge(edgeHeap.extract_min())


for threshold in THRESHOLDS:
    debug("Reducing up to threshold value %d" % threshold)
    cull_short_edges(threshold)
    debug('The size of the heap is', len(edgeHeap.all_elements()))
    print_current_edges(threshold)

debug('rest took', time.clock() - start)
