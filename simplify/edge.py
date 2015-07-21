from heap import HeapAble
from point import Point
from pprint import PrettyPrinter
pp = PrettyPrinter()


class Edge(HeapAble):
    next_id = 0
    def __init__(self, point_1, point_2, virtual, safe=True, extra_data=None):
        self.id = Edge.next_id
        Edge.next_id += 1
        self._extra_data = extra_data
        self.heap_index = None
        self._point_1 = point_1
        self._point_2 = point_2
        self._len2 = point_1.len2(point_2)
        self._virtual = virtual
        self._points = {point_1, point_2}
        point_1.add_edge(self, fix=safe)
        point_2.add_edge(self, fix=safe)
        super(Edge, self).__init__()

    def virtual(self):
        return self._virtual

    def p1(self):
        return self._point_1

    def p2(self):
        return self._point_2

    def len2(self):
        return self._len2

    def __repr__(self):
        heap_index = self.heap_index if self.heap_index is not None else -1
        kind = 'virtual' if self._virtual else 'real'
        return 'Edge(%r, %r, %s, %d)' % (self._point_1, self._point_2, kind, heap_index)

    def __str__(self):
        return repr(self)

    def __eq__(self, other):
        return self.same_endpoints(other) and self.virtual() == other.virtual()

    def same_endpoints(self, x):
        return self._points == x._points

    def __hash__(self):
        return hash(self._point_1) * hash(self._point_2)

    def can_be_collapsed(self):
        if self._virtual:
            return self._point_1.real_degree() < 2 or self._point_2.real_degree() < 2
        return self._point_1.real_degree() > 1 or self._point_2.real_degree() > 1

    def __lt__(self, other):
        if self.can_be_collapsed() and other.can_be_collapsed():
            return self.len2() < other.len2()
        return self.can_be_collapsed()

    def replace_point(self, old, new):
        if self._point_1 == old:
            self._point_1 = new
        elif self._point_2 == old:
            self._point_2 = new
        else:
            raise Exception("Can't remove a point that wasn't there")
        self._len2 = self._point_1.len2(self._point_2)
        self._points = {self._point_1, self._point_2}

    def collapse(self):
        p1 = self.p1()
        p2 = self.p2()
        new_x = (p1.x() + p2.x() ) * .5
        new_y = (p1.y() + p2.y() ) * .5
        new_point = Point(new_x, new_y)

        neighbor_vertices = p1.neighbors() | p2.neighbors()

        for edge in p1.edges():
            edge.replace_point(p1, new_point)
        for edge in p2.edges():
            edge.replace_point(p2, new_point)

        edges_to_change = p1.edges() + p2.edges()
        for edge in edges_to_change:
            if edge.len2() > 0:
                new_point.add_edge(edge)

        for edge in new_point.edges():
            edge._extra_data |= self._extra_data

        p1.clear_edges()
        p2.clear_edges()

        for vertex in neighbor_vertices:
            vertex.fix_edges()

        removed_edges = set()
        kept_edges = { id(x) for p in neighbor_vertices for x in p.edges()}
        for edge in edges_to_change:
            if id(edge) not in kept_edges:
                removed_edges.add(edge)

        return new_point, list(removed_edges)
