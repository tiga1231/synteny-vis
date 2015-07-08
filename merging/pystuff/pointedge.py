import sys

GLOBAL_POINTS = []
INSERTION_INDEX_MAP = {}

def getGlobalPoint(i):
    assert i >= 0 and i < len(GLOBAL_POINTS), i
    lookup = GLOBAL_POINTS[i]
    if type(lookup) == int:
        return getGlobalPoint(lookup)
    return lookup

def getRealPointIndex(i):
    lookup = GLOBAL_POINTS[i]
    if type(lookup) == int:
        return getRealPointIndex(lookup)
    return i

def addGlobalPoint(p):
    GLOBAL_POINTS.append(p)
    index = len(GLOBAL_POINTS) - 1
    INSERTION_INDEX_MAP[p] = index
    return index

def hasGlobalPoint(p):
    return p in INSERTION_INDEX_MAP.keys()

def indexOfGlobalPoint(p):
    return INSERTION_INDEX_MAP[p]

def redirectGlobalPoint(i, j):
    if i == j: return
    GLOBAL_POINTS[i] = getRealPointIndex(j)
    fixupTable()

def getAllGlobalPoints():
    return [x for x in GLOBAL_POINTS if type(x) != int]

count = 0
def fixupTable():
    global count
    count += 1
    if count % 10 == 0:
        for i in range(len(GLOBAL_POINTS)):
            if type(GLOBAL_POINTS[i]) == int:
                GLOBAL_POINTS[i] = getRealPointIndex(i)

def globalPointCount():
    return len([x for x in GLOBAL_POINTS if type(x) != int])

def _reset():
    GLOBAL_POINTS.clear()
    INSERTION_INDEX_MAP.clear()
    global count
    count = 0

EPS = .001
class point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.edges = set()

    def addEdge(self, edgeIndex):
        self.edges.add(edgeIndex)

    def __eq__(self, other):
        return abs(self.x - other.x) < EPS and abs(self.y - other.y) < EPS

    def __str__(self):
        return repr(self)

    def __repr__(self):
        if len(self.edges) > 5:
            return 'Point(%f, %f, w/edges:|%d|)' % (self.x, self.y, len(self.edges))
        else:
            return 'Point(%f, %f, w/edges:%s)' % (self.x, self.y, str(self.edges))

    def len2(self, other):
        return (self.x - other.x)**2 + (self.y - other.y)**2

    def realDegree(self):
        return len([x for x in self.edges if not x.isVirtual])

    def __hash__(self):
        return int(self.x * self.y)


class edge:
    def __init__(self, p1, p2, isVirtual):
        self.p1 = p1
        self.p2 = p2
        self.isVirtual = isVirtual
        getGlobalPoint(p1).addEdge(self)
        getGlobalPoint(p2).addEdge(self)
        self.heapHandle = None

    def __repr__(self):
        return 'Edge(%d, %d)' % (self.p1, self.p2)
    def __str__(self):
        return repr(self)
    def len2(self):
        return getGlobalPoint(self.p1).len2(getGlobalPoint(self.p2))
    def equalUpToVirtuality(self, other):
        direct1 = getGlobalPoint(self.p1) == getGlobalPoint(other.p1) 
        direct2 = getGlobalPoint(self.p2) == getGlobalPoint(other.p2) 
        inverse1 = getGlobalPoint(self.p1) == getGlobalPoint(other.p2) 
        inverse2 = getGlobalPoint(self.p2) == getGlobalPoint(other.p1) 
        return (direct1 and direct2) or (inverse1 and inverse2)

    def __eq__(self, other):
        if self.isVirtual != other.isVirtual:
            return False
        direct1 = getGlobalPoint(self.p1) == getGlobalPoint(other.p1) 
        direct2 = getGlobalPoint(self.p2) == getGlobalPoint(other.p2) 
        inverse1 = getGlobalPoint(self.p1) == getGlobalPoint(other.p2) 
        inverse2 = getGlobalPoint(self.p2) == getGlobalPoint(other.p1) 
        return (direct1 and direct2) or (inverse1 and inverse2)

    def canBeCollapsed(self):
        p1 = getGlobalPoint(self.p1)
        p2 = getGlobalPoint(self.p2)
        p1Degree = p1.realDegree()
        p2Degree = p2.realDegree()
        if self.isVirtual:
            return p1Degree == 0 or p2Degree == 0 or (p1Degree < 2 and p2Degree < 2)
        else:
            return p1Degree + p2Degree >= 3

    def __hash__(self):
        return hash(getGlobalPoint(self.p1)) * hash(getGlobalPoint(self.p2))

def tests():
    p = point(1,1)
    assert len(p.edges) == 0
    assert p.len2(p) == 0

    global GLOBAL_POINTS
    GLOBAL_POINTS = [{}, {}, {}, {}]
    redirectGlobalPoint(0, 1)
    redirectGlobalPoint(1, 2)
    redirectGlobalPoint(2, 3)
    assert GLOBAL_POINTS == [1, 2, 3, {}], GLOBAL_POINTS
    global count
    count = 9
    fixupTable()
    assert GLOBAL_POINTS == [3, 3, 3, {}], GLOBAL_POINTS


def collapseTests():
    p = point(1, 1)
    q = point(2, 2)
    s = point(3, 3)
    t = point(4, 4)
    pindex = addGlobalPoint(p)
    qindex = addGlobalPoint(q)
    sindex = addGlobalPoint(s)
    tindex = addGlobalPoint(t)
    real = edge(pindex, qindex, False)
    virtual = edge(sindex, qindex, True)
    real2 = edge(sindex, tindex, False)
    assert not real.canBeCollapsed()
    assert not real2.canBeCollapsed()
    assert virtual.canBeCollapsed()

def collapseTests2():
    p = point(1, 1)
    q = point(2, 2)
    s = point(3, 3)
    t = point(4, 4)
    pindex = addGlobalPoint(p)
    qindex = addGlobalPoint(q)
    sindex = addGlobalPoint(s)
    tindex = addGlobalPoint(t)
    real1 = edge(pindex, qindex, False)
    real2 = edge(sindex, qindex, False)
    assert real1.canBeCollapsed()
    assert real2.canBeCollapsed()

def collapseTests3():
    p = point(1, 1)
    q = point(2, 2)
    s = point(3, 3)
    t = point(4, 4)
    pindex = addGlobalPoint(p)
    qindex = addGlobalPoint(q)
    sindex = addGlobalPoint(s)
    tindex = addGlobalPoint(t)
    real1 = edge(pindex, qindex, False)
    real2 = edge(sindex, qindex, False)
    virtual = edge(sindex, pindex, True)
    assert real1.canBeCollapsed()
    assert real2.canBeCollapsed()
    #assert not virtual.canBeCollapsed()

def collapseTests4():
    p = point(1, 1)
    q = point(2, 2)
    s = point(3, 3)
    t = point(4, 4)
    pindex = addGlobalPoint(p)
    qindex = addGlobalPoint(q)
    sindex = addGlobalPoint(s)
    tindex = addGlobalPoint(t)
    e1 = edge(pindex, qindex, False)
    e2 = edge(sindex, qindex, False)
    e3 = edge(tindex, qindex, True)
    assert e3.canBeCollapsed()

tests()
_reset()
collapseTests()
_reset()
collapseTests2()
_reset()
collapseTests3()
_reset()
collapseTests4()
_reset()
