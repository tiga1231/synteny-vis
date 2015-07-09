__author__ = 'seanastephens'

class Point:

    EPS = 0.001
    count = 0

    def __init__(self, x, y):
        self.__x = x
        self.__y = y
        self.__edges = set()
        self.__hash = Point.count
        Point.count += 1

    def x(self):
        return self.__x

    def y(self):
        return self.__y

    def add_edge(self, edge_index):
        self.__edges.add(edge_index)

    def __eq__(self, other):
        return hash(self) == hash(other)

    def __str__(self):
        return repr(self)

    def __repr__(self):
        num_edges = len(self.__edges)
        return 'Point(%f, %f, w/edges:|%d|)' % (self.x(), self.y(), num_edges)

    def len2(self, other):
        return (self.x() - other.x()) ** 2 + (self.y() - other.y()) ** 2

    def real_degree(self):
        return len([x for x in self.__edges if not x.virtual()])

    def __hash__(self):
        return self.__hash


