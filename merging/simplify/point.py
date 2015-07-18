__author__ = 'seanastephens'


class Point:
    EPS = .0001

    def __init__(self, x, y):
        self.__x = x
        self.__y = y
        self.__edges = []

    def x(self):
        return self.__x

    def y(self):
        return self.__y

    def add_edge(self, edge):
        self.__edges.append(edge)
        self.fix_edges()

    def fix_edges(self):
        new_edges = set()
        old_real_edges = [x for x in self.__edges if not x.virtual()]
        old_virtual_edges = [x for x in self.__edges if x.virtual()]

        for old_edge in sorted(old_real_edges, key=lambda x: x.id):
            if not any(old_edge.same_endpoints(x) for x in new_edges):
                new_edges.add(old_edge)

        for old_edge in sorted(old_virtual_edges, key=lambda x: x.id):
            if not any(old_edge.same_endpoints(x) for x in new_edges):
                new_edges.add(old_edge)

        self.__edges = list(new_edges)

    def __eq__(self, other):
        return abs(self.x() - other.x()) < Point.EPS and abs(self.y() - other.y()) < Point.EPS

    def __str__(self):
        return repr(self)

    def __repr__(self):
        num_edges = len(self.__edges)
        return 'Point(%.2f, %.2f, w/edges:|%d|)' % (self.x(), self.y(), num_edges)

    def len2(self, other):
        return (self.x() - other.x()) ** 2 + (self.y() - other.y()) ** 2

    def real_degree(self):
        return len([x for x in self.__edges if not x.virtual()])

    def __hash__(self):
        return 1

    def edges(self):
        return list(self.__edges)

    def clear_edges(self):
        self.__edges = []

    def neighbors(self):
        edges = self.edges()
        possible = {point for edge in edges for point in [edge.p1(), edge.p2()]}
        return possible - {self}


