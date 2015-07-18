from heap import HeapAble
from point import Point
from pprint import PrettyPrinter
pp = PrettyPrinter()


class Edge(HeapAble):
    next_id = 0
    def __init__(self, point_1, point_2, virtual):
        self.id = Edge.next_id
        Edge.next_id += 1
        self.heap_index = None
        self.__point_1 = point_1
        self.__point_2 = point_2
        self.__virtual = virtual
        point_1.add_edge(self)
        point_2.add_edge(self)
        super(Edge, self).__init__()

    def virtual(self):
        return self.__virtual

    def p1(self):
        return self.__point_1

    def p2(self):
        return self.__point_2

    def len2(self):
        return self.__point_1.len2(self.__point_2)

    def __repr__(self):
        heap_index = self.heap_index if self.heap_index is not None else -1
        kind = 'virtual' if self.__virtual else 'real'
        return 'Edge(%r, %r, %s, %d)' % (self.__point_1, self.__point_2, kind, heap_index)

    def __str__(self):
        return repr(self)

    def __eq__(self, other):
        return self.same_endpoints(other) and self.virtual() == other.virtual()

    def same_endpoints(self, other):
        direct = self.p1() == other.p1() and self.p2() == other.p2()
        inverse = self.p1() == other.p2() and self.p2() == other.p1()
        return direct or inverse

    def __hash__(self):
        return 1

    def can_be_collapsed(self):
        if self.__virtual:
            return self.__point_1.real_degree() < 2 or self.__point_2.real_degree() < 2
        return self.__point_1.real_degree() > 1 or self.__point_2.real_degree() > 1

    def __lt__(self, other):
        if self.can_be_collapsed() and other.can_be_collapsed():
            return self.len2() < other.len2()
        return self.can_be_collapsed()

    def replace_point(self, old, new):
        if self.__point_1 == old:
            self.__point_1 = new
        elif self.__point_2 == old:
            self.__point_2 = new
        else:
            raise Exception("Can't remove a point that wasn't there")
        self.__points = {self.__point_1, self.__point_2}

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

        p1.clear_edges()
        p2.clear_edges()

        for vertex in neighbor_vertices:
            vertex.fix_edges()

        removed_edges = set()
        for edge in edges_to_change:
            if all(id(edge) not in [id(x) for x in p.edges()] for p in neighbor_vertices):
                removed_edges.add(edge)

        return new_point, list(removed_edges)

