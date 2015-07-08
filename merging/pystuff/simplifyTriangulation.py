import sys
import collections
import heap
import time
import pointedge

PRINT_REAL_EDGES_ONLY = True
MAX_CYCLES_PER_LEVEL = 100
DEBUG = False

def debug(*args):
    if DEBUG: print(*args)

if sys.argv[1] != '--name':
    print("First argument should be --name FILENAME_BASE")
    sys.exit(1)

baseName = sys.argv[2]

THRESHOLDS = [int(x) for x in sys.argv[3:]]

start = time.clock()
edgeHeap = heap.minheap()
next(sys.stdin) # discard header
for line in sys.stdin:
    x1, y1, x2, y2, kind = line.split(',');
    isVirtual = kind.strip() == 'virtual'

    p1 = pointedge.point(float(x1), float(y1))
    p2 = pointedge.point(float(x2), float(y2))

    if pointedge.hasGlobalPoint(p1):
        p1Index = pointedge.indexOfGlobalPoint(p1)
    else:
        p1Index = pointedge.addGlobalPoint(p1)

    if pointedge.hasGlobalPoint(p2):
        p2Index = pointedge.indexOfGlobalPoint(p2)
    else:
        p2Index = pointedge.addGlobalPoint(p2)

    e = pointedge.edge(p1Index, p2Index, isVirtual)

    e.heapHandle = edgeHeap.insert(e, e.len2())


debug('setup took', time.clock() - start)
start = time.clock()

def collapsePoint(p1idx, p2idx):
    p1 = pointedge.getGlobalPoint(p1idx);
    p2 = pointedge.getGlobalPoint(p2idx);

    newX = .5 * (p1.x + p2.x)
    newY = .5 * (p1.y + p2.y)
    newP = pointedge.point(newX, newY)
    newP.edges = p1.edges | p2.edges
    pIndex = pointedge.addGlobalPoint(newP)

    pointedge.redirectGlobalPoint(pointedge.getRealPointIndex(p1idx), pIndex)
    pointedge.redirectGlobalPoint(pointedge.getRealPointIndex(p2idx), pIndex)

    return newP;

def removeRealVirtualPairs(edges):
    realEdges = { x for x in edges if not x.isVirtual }
    virtualEdges = { x for x in edges if x.isVirtual }
    for e in virtualEdges:
        if not any(e.equalUpToVirtuality(f) for f in realEdges):
            realEdges.add(e)
    return realEdges

def removeEdgesFromHeap(edges):
    for edge in edges:
        if edge.heapHandle.valid:
            edgeHeap.removeElement(edge.heapHandle)

def updateEdgesInHeap(edges):
    for edge in edges:
        if edge.heapHandle.valid:
            edgeHeap.changeKey(edge.heapHandle, edge.len2())
        else:
            edge.heapHandle = edgeHeap.insert(edge, edge.len2())

def collapseEdge(edgeToCollapse):
    newP = collapsePoint(edgeToCollapse.p1, edgeToCollapse.p2)
    
    pointsToUpdate  = { newP }
    pointsToUpdate |= { pointedge.getGlobalPoint(x.p1) for x in newP.edges }
    pointsToUpdate |= { pointedge.getGlobalPoint(x.p2) for x in newP.edges }
     
    for point in pointsToUpdate:
        newEdges = { edge for edge in point.edges if edge.len2() > 0 }
        newEdges = removeRealVirtualPairs(newEdges)

        updateEdgesInHeap(newEdges)
        removeEdgesFromHeap(point.edges - newEdges)
        point.edges = newEdges

def getFileName(i):
    return baseName + '.' + str(i) + '.csv'

def printCurrentEdges(threshold):
    outfile = open(getFileName(threshold), 'w')
    allEdges = { e for p in pointedge.getAllGlobalPoints() for e in p.edges}

    outfile.write('x1,y1,x2,y2,type\n')
    for edge in allEdges:
        if PRINT_REAL_EDGES_ONLY and edge.isVirtual:
            continue
        p1 = pointedge.getGlobalPoint(edge.p1)
        p2 = pointedge.getGlobalPoint(edge.p2)
        kind = 'virtual' if edge.isVirtual else 'real'
        outfile.write('%f,%f,%f,%f,%s\n' % (p1.x, p1.y, p2.x, p2.y, kind))
    debug('There were', len(allEdges), 'edges')

    outfile.close()

discardedEdges = []
def cullShortEdges(maxLength):
    while edgeHeap.size() > 0 and edgeHeap.findMin().len2() < maxLength**2:
        edge = edgeHeap.extractMin()
        if edge.canBeCollapsed():
            collapseEdge(edge)
        else:
            discardedEdges.append(edge)

for threshold in THRESHOLDS:
    debug("Reducing up to threshold value %d" % threshold)

    iteration = 0
    lastLength = len(discardedEdges)
    cullShortEdges(threshold)
    while len(discardedEdges) > 0 and lastLength != len(discardedEdges):
        iteration += 1
        debug('discarded:', len(discardedEdges), ', last time:', lastLength)
        lastLength = len(discardedEdges)
        updateEdgesInHeap(discardedEdges)
        discardedEdges.clear()
        if iteration >= MAX_CYCLES_PER_LEVEL:
            debug('Reached max discarded_edge cycles per iteration')
            break
        cullShortEdges(threshold)

    debug('The size of the heap is', len(edgeHeap.A))
    printCurrentEdges(threshold)

debug('rest took', time.clock() - start)
