import itertools

__author__ = 'seanastephens'


class Point:
    # Don't forget the inlined stuff in __eq__!
    EPS = .0001
    HASH_FACTOR = 1 / EPS**2

    def __init__(self, x, y):
        self._x = x
        self._y = y
        self._edges = []
        self._hash = int(self.x() * self.y() * Point.HASH_FACTOR)
        self._real_count = 0

    def x(self):
        return self._x

    def y(self):
        return self._y

    def add_edge(self, edge, fix=True):
        self._edges.append(edge)
        if fix:
            self.fix_edges()
        self.__update_real_count()

    def __update_real_count(self):
        self._real_count = len(self._edges) - sum([x._virtual for x in self._edges])

    def fix_edges(self):
        # Optimizing for the common case: no changes
        if len({x._point_1 for x in self._edges} | {x._point_2 for x in self._edges}) == len(self._edges) + 1:
            return

        new_edges = set()
        annotated_edges = {(x.p1() if x.p1() != self else x.p2(), x) for x in self._edges}
        for key, group in itertools.groupby(annotated_edges, key=lambda x: x[0]):
            group = [x[1] for x in group]
            if len(group) == 1:
                new_edges.add(group[0])
            else:
                temp = set()
                old_real_edges = sorted([x for x in group if not x.virtual()], key=lambda x: x.id)
                old_virtual_edges = sorted([x for x in group if x.virtual()], key=lambda x: x.id)

                for old_edge in old_real_edges:
                    if not any([old_edge.same_endpoints(x) for x in temp]):
                        temp.add(old_edge)

                for old_edge in old_virtual_edges:
                    if not any([old_edge.same_endpoints(x) for x in temp]):
                        temp.add(old_edge)
                new_edges |= temp

        self._edges = list(new_edges)

    def __eq__(self, other):
        return (self._x - other._x) * (self._x - other._x) < .0001 and abs(self._y - other._y) < .0001

    def __str__(self):
        return repr(self)

    def __repr__(self):
        num_edges = len(self._edges)
        return 'Point(%.2f, %.2f, w/edges:|%d|)' % (self.x(), self.y(), num_edges)

    def len2(self, other):
        return (self.x() - other.x()) ** 2 + (self.y() - other.y()) ** 2

    def real_degree(self):
        return self._real_count

    def __hash__(self):
        return self._hash

    def edges(self):
        return list(self._edges)

    def clear_edges(self):
        self._edges = []

    def neighbors(self):
        edges = self.edges()
        possible = {point for edge in edges for point in [edge.p1(), edge.p2()]}
        return possible - {self}


