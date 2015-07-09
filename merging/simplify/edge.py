class Edge:
    def __init__(self, point_1, point_2, virtual):
        self.__point_1 = point_1
        self.__point_2 = point_2
        self.__points = {point_1, point_2}
        self.__virtual = virtual

    def virtual(self):
        return self.__virtual

    def points(self):
        return set(self.__points)

    def len2(self):
        return self.__point_1.len2(self.__point_2)

    def __repr__(self):
        return 'Edge(%d, %d)' % (self.__point_1, self.__point_2)

    def __str__(self):
        return repr(self)

    def __eq__(self, other):
        return self.points() == other.points()

    def __hash__(self):
        return sum(hash(x) for x in self.points())
