import sys
import time

import heap
import pointedge

PRINT_REAL_EDGES_ONLY = True
MAX_CYCLES_PER_LEVEL = 100
DEBUG = False


def debug(*args):
    if DEBUG:
        print(*args)


if sys.argv[1] != '--name':
    print("First argument should be --name FILENAME_BASE")
    sys.exit(1)

baseName = sys.argv[2]

THRESHOLDS = [int(x) for x in sys.argv[3:]]

start = time.clock()
edgeHeap = heap.MinHeap()
next(sys.stdin)  # discard header
for line in sys.stdin:
    x1, y1, x2, y2, edge_type = line.split(',')
    virtual = edge_type.strip() == 'virtual'

    point_1 = pointedge.Point(float(x1), float(y1))
    point_2 = pointedge.Point(float(x2), float(y2))

    if pointedge.has_global_point(point_1):
        point_1_index = pointedge.index_of_global_point(point_1)
    else:
        point_1_index = pointedge.add_global_point(point_1)

    if pointedge.has_global_point(point_2):
        point_2_index = pointedge.index_of_global_point(point_2)
    else:
        point_2_index = pointedge.add_global_point(point_2)

    new_edge = pointedge.Edge(point_1_index, point_2_index, virtual)

    new_edge.heapHandle = edgeHeap.insert(new_edge, new_edge.len2())

debug('setup took', time.clock() - start)
start = time.clock()


def collapse_point(p1idx, p2idx):
    p1 = pointedge.get_global_point(p1idx)
    p2 = pointedge.get_global_point(p2idx)

    new_x = .5 * (p1.x + p2.x)
    new_y = .5 * (p1.y + p2.y)
    new_point = pointedge.Point(new_x, new_y)
    new_point.edges = p1.edges | p2.edges
    point_index = pointedge.add_global_point(new_point)

    pointedge.redirect_global_point(pointedge.get_real_point_index(p1idx), point_index)
    pointedge.redirect_global_point(pointedge.get_real_point_index(p2idx), point_index)

    return new_point


def remove_real_virtual_pairs(edges):
    real_edges = {x for x in edges if not x.virtual}
    virtual_edges = {x for x in edges if x.virtual}
    for e in virtual_edges:
        if not any(e.equal_up_to_virtual(f) for f in real_edges):
            real_edges.add(e)
    return real_edges


def remove_edges_from_heap(edges):
    for edge in edges:
        if edge.heapHandle.valid:
            edgeHeap.remove_element(edge.heapHandle)


def update_edges_in_heap(edges):
    for edge in edges:
        if edge.heapHandle.valid:
            edgeHeap.change_key(edge.heapHandle, edge.len2())
        else:
            edge.heapHandle = edgeHeap.insert(edge, edge.len2())


def collapse_edge(edge_to_collapse):
    new_point = collapse_point(edge_to_collapse.p1, edge_to_collapse.p2)

    points_to_update = {new_point}
    points_to_update |= {pointedge.get_global_point(x.p1) for x in new_point.edges}
    points_to_update |= {pointedge.get_global_point(x.p2) for x in new_point.edges}

    for point in points_to_update:
        new_edges = {edge for edge in point.edges if edge.len2() > 0}
        new_edges = remove_real_virtual_pairs(new_edges)

        update_edges_in_heap(new_edges)
        remove_edges_from_heap(point.edges - new_edges)
        point.edges = new_edges


def get_file_name(i):
    return baseName + '.' + str(i) + '.csv'


def print_current_edges(max_edge_length):
    outfile = open(get_file_name(max_edge_length), 'w')
    all_edges = {e for p in pointedge.get_all_global_points() for e in p.edges}

    outfile.write('x1,y1,x2,y2,type\n')
    for edge in all_edges:
        if PRINT_REAL_EDGES_ONLY and edge.virtual:
            continue
        p1 = pointedge.get_global_point(edge.p1)
        p2 = pointedge.get_global_point(edge.p2)
        kind = 'virtual' if edge.virtual else 'real'
        outfile.write('%f,%f,%f,%f,%s\n' % (p1.x, p1.y, p2.x, p2.y, kind))
    debug('There were', len(all_edges), 'edges')

    outfile.close()


discarded_edges = []


def cull_short_edges(max_length):
    while edgeHeap.size() > 0 and edgeHeap.find_min().len2() < max_length ** 2:
        edge = edgeHeap.extract_min()
        if edge.can_be_collapsed():
            collapse_edge(edge)
        else:
            discarded_edges.append(edge)


for threshold in THRESHOLDS:
    debug("Reducing up to threshold value %d" % threshold)

    iteration = 0
    lastLength = len(discarded_edges)
    cull_short_edges(threshold)
    while 0 < len(discarded_edges) != lastLength:
        iteration += 1
        debug('discarded:', len(discarded_edges), ', last time:', lastLength)
        lastLength = len(discarded_edges)
        update_edges_in_heap(discarded_edges)
        discarded_edges.clear()
        if iteration >= MAX_CYCLES_PER_LEVEL:
            debug('Reached max discarded_edge cycles per iteration')
            break
        cull_short_edges(threshold)

    debug('The size of the heap is', len(edgeHeap.heap))
    print_current_edges(threshold)

debug('rest took', time.clock() - start)
