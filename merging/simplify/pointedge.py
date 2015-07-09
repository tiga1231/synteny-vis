from point import Point

GLOBAL_POINTS = []
INSERTION_INDEX_MAP = {}


def get_global_point(i):
    assert 0 <= i < len(GLOBAL_POINTS), i
    lookup = GLOBAL_POINTS[i]
    if type(lookup) == int:
        return get_global_point(lookup)
    return lookup


def get_real_point_index(i):
    lookup = GLOBAL_POINTS[i]
    if type(lookup) == int:
        return get_real_point_index(lookup)
    return i


def add_global_point(p):
    GLOBAL_POINTS.append(p)
    index = len(GLOBAL_POINTS) - 1
    INSERTION_INDEX_MAP[p] = index
    return index


def has_global_point(p):
    return p in INSERTION_INDEX_MAP.keys()


def index_of_global_point(p):
    return INSERTION_INDEX_MAP[p]


def redirect_global_point(i, j):
    if i == j:
        return
    GLOBAL_POINTS[i] = get_real_point_index(j)
    fix_table()


def get_all_global_points():
    return [x for x in GLOBAL_POINTS if type(x) != int]


count = 0


def fix_table():
    global count
    count += 1
    if count % 10 == 0:
        for i in range(len(GLOBAL_POINTS)):
            if type(GLOBAL_POINTS[i]) == int:
                GLOBAL_POINTS[i] = get_real_point_index(i)


def global_point_count():
    return len([x for x in GLOBAL_POINTS if type(x) != int])


def _reset():
    GLOBAL_POINTS.clear()
    INSERTION_INDEX_MAP.clear()
    global count
    count = 0


class Edge:
    def __init__(self, p1, p2, virtual):
        self.p1 = p1
        self.p2 = p2
        self.virtual = virtual
        get_global_point(p1).add_edge(self)
        get_global_point(p2).add_edge(self)
        self.heapHandle = None

    def __repr__(self):
        return 'Edge(%d, %d)' % (self.p1, self.p2)

    def __str__(self):
        return repr(self)

    def len2(self):
        return get_global_point(self.p1).len2(get_global_point(self.p2))

    def equal_up_to_virtual(self, other):
        direct1 = get_global_point(self.p1) == get_global_point(other.p1)
        direct2 = get_global_point(self.p2) == get_global_point(other.p2)
        inverse1 = get_global_point(self.p1) == get_global_point(other.p2)
        inverse2 = get_global_point(self.p2) == get_global_point(other.p1)
        return (direct1 and direct2) or (inverse1 and inverse2)

    def __eq__(self, other):
        if self.virtual != other.virtual:
            return False
        direct1 = get_global_point(self.p1) == get_global_point(other.p1)
        direct2 = get_global_point(self.p2) == get_global_point(other.p2)
        inverse1 = get_global_point(self.p1) == get_global_point(other.p2)
        inverse2 = get_global_point(self.p2) == get_global_point(other.p1)
        return (direct1 and direct2) or (inverse1 and inverse2)

    def can_be_collapsed(self):
        p1 = get_global_point(self.p1)
        p2 = get_global_point(self.p2)
        p1_degree = p1.real_degree()
        p2_degree = p2.real_degree()
        if self.virtual:
            return p1_degree == 0 or p2_degree == 0 or (p1_degree < 2 and p2_degree < 2)
        else:
            return p1_degree + p2_degree >= 3

    def __hash__(self):
        return hash(get_global_point(self.p1)) * hash(get_global_point(self.p2))


def _tests():
    p = Point(1, 1)
    assert len(p.__edges) == 0
    assert p.len2(p) == 0

    global GLOBAL_POINTS
    GLOBAL_POINTS = [{}, {}, {}, {}]
    redirect_global_point(0, 1)
    redirect_global_point(1, 2)
    redirect_global_point(2, 3)
    assert GLOBAL_POINTS == [1, 2, 3, {}], GLOBAL_POINTS
    global count
    count = 9
    fix_table()
    assert GLOBAL_POINTS == [3, 3, 3, {}], GLOBAL_POINTS


def collapse_tests():
    p = Point(1, 1)
    q = Point(2, 2)
    s = Point(3, 3)
    t = Point(4, 4)
    p_index = add_global_point(p)
    q_index = add_global_point(q)
    s_index = add_global_point(s)
    t_index = add_global_point(t)
    real = Edge(p_index, q_index, False)
    virtual = Edge(s_index, q_index, True)
    real2 = Edge(s_index, t_index, False)
    assert not real.can_be_collapsed()
    assert not real2.can_be_collapsed()
    assert virtual.can_be_collapsed()


def collapse_tests2():
    p = Point(1, 1)
    q = Point(2, 2)
    s = Point(3, 3)
    t = Point(4, 4)
    p_index = add_global_point(p)
    q_index = add_global_point(q)
    s_index = add_global_point(s)
    add_global_point(t)
    real1 = Edge(p_index, q_index, False)
    real2 = Edge(s_index, q_index, False)
    assert real1.can_be_collapsed()
    assert real2.can_be_collapsed()


def collapse_tests3():
    p = Point(1, 1)
    q = Point(2, 2)
    s = Point(3, 3)
    t = Point(4, 4)
    p_index = add_global_point(p)
    q_index = add_global_point(q)
    s_index = add_global_point(s)
    add_global_point(t)
    real1 = Edge(p_index, q_index, False)
    real2 = Edge(s_index, q_index, False)
    Edge(s_index, p_index, True)
    assert real1.can_be_collapsed()
    assert real2.can_be_collapsed()
    # assert not virtual.can_be_collapsed()


def collapse_tests4():
    p = Point(1, 1)
    q = Point(2, 2)
    s = Point(3, 3)
    t = Point(4, 4)
    p_index = add_global_point(p)
    q_index = add_global_point(q)
    s_index = add_global_point(s)
    t_index = add_global_point(t)
    Edge(p_index, q_index, False)
    Edge(s_index, q_index, False)
    e3 = Edge(t_index, q_index, True)
    assert e3.can_be_collapsed()


_tests()
_reset()
collapse_tests()
_reset()
collapse_tests2()
_reset()
collapse_tests3()
_reset()
collapse_tests4()
_reset()
