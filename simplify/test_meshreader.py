from unittest import TestCase

from meshreader import stream_to_edge_list, parse_vertex, parse_edge
from point import Point

__author__ = 'seanastephens'

test1 = [
    '4 5\n',
    '0,0\n',
    '0,3\n',
    '1,3\n',
    '1,0\n',
    '1,2,real\n',
    '0,3,real\n',
    '3,1,virtual\n',
    '1,0,real\n',
    '2,3,real\n'
]

# There was an issue with newlines -- this one puts a virtual at the end to test that case
test2 = [
    '4 5\n',
    '0,0\n',
    '0,3\n',
    '1,3\n',
    '1,0\n',
    '1,2,real\n',
    '0,3,real\n',
    '1,0,real\n',
    '2,3,real\n',
    '3,1,virtual\n'
]

#duplicates...
test3 = [
    '3 1\n',
    '0,0\n',
    '0,0\n',
    '1,0\n',
    '1,2,virtual\n'
]
test4 = [
    '3 2\n',
    '0,0\n',
    '0,0\n',
    '1,0\n',
    '0,1,virtual\n',
    '1,2,virtual\n'
]

class TestMeshReader(TestCase):
    def test_stream_to_edge_list(self):
        edge_list = stream_to_edge_list(iter(test1))
        self.assertEquals(5, len(edge_list), str(edge_list))

    def test_stream_to_edge_list2(self):
        edge_list = stream_to_edge_list(iter(test1))
        self.assertEquals(5, len(edge_list))
        vertices = {p for edge in edge_list for p in [edge.p1(), edge.p2()]}
        self.assertEqual(10, sum(len(x.edges()) for x in vertices))

    def test_stream_to_edge_list3(self):
        edge_list = stream_to_edge_list(iter(test1))
        self.assertEquals(5, len(edge_list))
        self.assertEqual(1, len([x for x in edge_list if x.virtual()]))
        self.assertEqual(4, len([x for x in edge_list if not x.virtual()]))

    def test_stream_to_edge_list4(self):
        edge_list = stream_to_edge_list(iter(test2))
        self.assertEquals(5, len(edge_list))
        self.assertEqual(1, len([x for x in edge_list if x.virtual()]))
        self.assertEqual(4, len([x for x in edge_list if not x.virtual()]))

    def test_parse_vertex(self):
        self.assertEqual(Point(1, 1), parse_vertex("1,1"))

    def test_parse_edge(self):
        self.assertEqual((1, 1, False), parse_edge('1,1,real'))

    def test_parse_edge2(self):
        self.assertEqual((1, 2, True), parse_edge('1,2,virtual'))

    def test_stream_on_dups(self):
        edge_list = stream_to_edge_list(iter(test3))
        self.assertEquals(1, len(edge_list))

    def test_removes_zero_length_edges(self):
        edge_list = stream_to_edge_list(iter(test4))
        self.assertEquals(1, len(edge_list))